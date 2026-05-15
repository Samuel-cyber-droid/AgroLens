# inventario/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

# Modelos de la base de datos
from .models import Producto, MovimientoInventario

# Librerías para Google Vision y procesamiento de imagen
from google.cloud import vision
import base64

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def escanear_etiqueta(request):
    try:
        # 1. Recibir y limpiar la imagen
        imagen_b64 = request.data.get('imagen')
        if not imagen_b64:
            return Response({'error': 'No se proporcionó ninguna imagen'}, status=400)

        if ',' in imagen_b64:
            imagen_b64 = imagen_b64.split(',')[1]
        
        content = base64.b64decode(imagen_b64)

        # 2. IA de Google Vision
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=content)
        
        response = client.text_detection(image=image)
        annotations = response.text_annotations

        if not annotations:
            return Response({'error': 'No se detectó texto en la etiqueta. Intenta enfocar mejor.'}, status=400)

        texto_extraido = annotations[0].description.upper()

        if response.error.message:
            raise Exception(f"Error de Google Vision: {response.error.message}")

        # 3. Búsqueda inicial del producto
        producto_obj = None
        for p in Producto.objects.all():
            if p.nombre_comercial.upper() in texto_extraido or p.ingrediente_activo.upper() in texto_extraido:
                producto_obj = p
                break 

        # 4. LÓGICA DE STOCK Y RECOMENDACIÓN
        datos_producto = None
        recomendaciones = []
        mensaje = 'Texto leído, pero no coincide con el catálogo'

        if producto_obj:
            datos_producto = {
                'id': producto_obj.id,
                'nombre_comercial': producto_obj.nombre_comercial,
                'presentacion': producto_obj.presentacion,
                'stock_actual': producto_obj.stock_actual,
                'ingrediente_activo': producto_obj.ingrediente_activo
            }

            if producto_obj.stock_actual > 0:
                mensaje = 'Producto identificado correctamente y disponible en stock.'
            else:
                mensaje = f'¡Aviso! {producto_obj.nombre_comercial} NO TIENE STOCK. Buscando alternativas con {producto_obj.ingrediente_activo}...'
                
                # Buscamos en la BD productos con el mismo ingrediente, que tengan stock, y excluímos el que acabamos de escanear
                alternativas = Producto.objects.filter(
                    ingrediente_activo__iexact=producto_obj.ingrediente_activo,
                    stock_actual__gt=0
                ).exclude(id=producto_obj.id)

                for alt in alternativas:
                    recomendaciones.append({
                        'id': alt.id,
                        'nombre_comercial': alt.nombre_comercial,
                        'presentacion': alt.presentacion,
                        'stock_actual': alt.stock_actual
                    })
                
                if not recomendaciones:
                    mensaje = f'Producto sin stock. No hay alternativas disponibles para {producto_obj.ingrediente_activo}.'

        # 5. Respuesta al Frontend
        return Response({
            'texto_bruto': texto_extraido,
            'producto_detectado': datos_producto,
            'recomendaciones': recomendaciones, # Enviamos la lista de opciones al celular
            'mensaje': mensaje
        }, status=200)

    except Exception as e:
        print("🚨 ERROR EN GOOGLE VISION:", str(e))
        return Response({'error': f'Error al procesar imagen: {str(e)}'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_productos(request):
    """Retorna la lista de productos para la tabla de inventario"""
    try:
        productos = Producto.objects.all()
        data = []
        for p in productos:
            data.append({
                'id': p.id,
                'nombre': f"{p.nombre_comercial} - {p.ingrediente_activo} ({p.presentacion})", 
                'cantidad': p.stock_actual,  
            })
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def registrar_movimiento(request):
    """Registra entradas y salidas de producto actualizando el stock"""
    try:
        producto_id = request.data.get('producto_id')
        tipo_movimiento = request.data.get('tipo') # 'ENTRADA' o 'SALIDA'
        cantidad = int(request.data.get('cantidad', 0))

        if cantidad <= 0:
            return Response({'error': 'La cantidad debe ser mayor a cero'}, status=400)
            
        if tipo_movimiento not in ['ENTRADA', 'SALIDA']:
            return Response({'error': 'Tipo de movimiento no válido'}, status=400)

        producto = get_object_or_404(Producto, id=producto_id)

        # Usamos transaction.atomic para asegurar integridad de los datos
        with transaction.atomic():
            if tipo_movimiento == 'ENTRADA':
                producto.stock_actual += cantidad
            elif tipo_movimiento == 'SALIDA':
                if producto.stock_actual < cantidad:
                    return Response({'error': 'Stock insuficiente para esta salida'}, status=400)
                producto.stock_actual -= cantidad

            producto.save()

            # Crear registro en la bitácora
            MovimientoInventario.objects.create(
                producto=producto,
                usuario=request.user,
                tipo=tipo_movimiento,
                cantidad=cantidad,
                notas="Registrado vía AgroLens Mobile"
            )

        return Response({
            'mensaje': 'Movimiento registrado con éxito',
            'nuevo_stock': producto.stock_actual
        }, status=200)

    except Exception as e:
        print("🚨 ERROR EN REGISTRO DE MOVIMIENTO:", str(e))
        return Response({'error': str(e)}, status=500)