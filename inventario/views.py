# inventario/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

# Importamos tu motor de IA y los modelos de la base de datos
from .utils import extraer_texto_de_imagen
from .models import Producto, MovimientoInventario

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def escanear_etiqueta(request):
    try:
        # 1. Recibir la imagen en Base64 desde la cámara del celular/PC
        imagen_b64 = request.data.get('imagen')
        if not imagen_b64:
            return Response({'error': 'No se proporcionó ninguna imagen'}, status=400)

        # 2. Llamamos a tu función de utils.py que hace el trabajo pesado con EasyOCR
        texto_extraido = extraer_texto_de_imagen(imagen_b64)
        
        # 3. EL PARCHE: Si EasyOCR nos devolvió su matriz cruda (una lista con coordenadas), la limpiamos
        if isinstance(texto_extraido, list):
            # Extraemos solo la palabra (índice 1 de la tupla) y las unimos con un espacio
            textos_limpios = [str(item[1]) for item in texto_extraido if len(item) > 1]
            texto_extraido = " ".join(textos_limpios)
        
        # Validación de seguridad: verificamos que el texto no esté vacío
        if not texto_extraido or str(texto_extraido).strip() == "":
            return Response({'error': 'No se detectó ningún texto en la etiqueta. Intenta enfocar mejor.'}, status=400)

        # 4. Ahora sí, tenemos un texto plano seguro de convertir a mayúsculas
        texto_extraido = str(texto_extraido).upper() 

        # 5. Buscar coincidencias en el catálogo de PostgreSQL
        producto_encontrado = None
        productos = Producto.objects.all()

        for p in productos:
            nombre_comercial_upper = p.nombre_comercial.upper()
            ingrediente_upper = p.ingrediente_activo.upper()
            
            # Si el texto de la etiqueta contiene el nombre o el ingrediente activo
            if nombre_comercial_upper in texto_extraido or ingrediente_upper in texto_extraido:
                producto_encontrado = {
                    'id': p.id,
                    'nombre_comercial': p.nombre_comercial,
                    'presentacion': p.presentacion,
                    'stock_actual': p.stock_actual
                }
                break # Detenemos la búsqueda al encontrar el primer match

        # 6. Enviar la respuesta completa al Frontend
        return Response({
            'texto_bruto': texto_extraido,
            'producto_detectado': producto_encontrado,
            'mensaje': 'Producto identificado correctamente' if producto_encontrado else 'Texto leído, pero no coincide con el catálogo'
        }, status=200)

    except Exception as e:
        print("🚨 ERROR FATAL EN EL ESCÁNER:", str(e))
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_productos(request):
    try:
        # 1. Buscamos todos los agroquímicos en la base de datos
        productos = Producto.objects.all()
        
        # 2. Armamos una lista limpia para enviársela a la tabla de React
        data = []
        for p in productos:
            data.append({
                'id': p.id,
                # Juntamos el nombre y la presentación
                'nombre': f"{p.nombre_comercial} - {p.ingrediente_activo} ({p.presentacion})", 
                # Conectamos con el campo real de stock
                'cantidad': p.stock_actual,  
            })
            
        # 3. Enviamos la respuesta
        return Response(data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def registrar_movimiento(request):
    try:
        # Extraemos los datos que nos mandará React
        producto_id = request.data.get('producto_id')
        tipo_movimiento = request.data.get('tipo') # 'ENTRADA' o 'SALIDA'
        cantidad = int(request.data.get('cantidad', 0))

        if cantidad <= 0:
            return Response({'error': 'La cantidad debe ser mayor a cero'}, status=400)
            
        if tipo_movimiento not in ['ENTRADA', 'SALIDA', 'AJUSTE']:
            return Response({'error': 'Tipo de movimiento no válido'}, status=400)

        # Buscamos el producto en la base de datos
        producto = get_object_or_404(Producto, id=producto_id)

        # transaction.atomic() protege la base de datos: o hace todo o deshace todo
        with transaction.atomic():
            # 1. Calculamos el nuevo stock
            if tipo_movimiento == 'ENTRADA':
                producto.stock_actual += cantidad
            elif tipo_movimiento == 'SALIDA':
                if producto.stock_actual < cantidad:
                    return Response({'error': 'Stock insuficiente para esta salida'}, status=400)
                producto.stock_actual -= cantidad

            # 2. Guardamos el nuevo stock en el producto
            producto.save()

            # 3. Creamos la bitácora inmutable (auditoría)
            MovimientoInventario.objects.create(
                producto=producto,
                usuario=request.user,
                tipo=tipo_movimiento,
                cantidad=cantidad,
                notas="Movimiento registrado desde app móvil"
            )

        return Response({
            'mensaje': 'Movimiento registrado con éxito',
            'nuevo_stock': producto.stock_actual
        }, status=200)

    except Exception as e:
        print("🚨 ERROR FATAL EN MOVIMIENTO:", str(e))
        return Response({'error': str(e)}, status=500)