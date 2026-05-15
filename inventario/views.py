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
        # 1. Recibir la imagen en Base64 desde el Frontend
        imagen_b64 = request.data.get('imagen')
        if not imagen_b64:
            return Response({'error': 'No se proporcionó ninguna imagen'}, status=400)

        # 2. Procesar la imagen para Google Vision
        # Si la imagen viene con el prefijo "data:image/jpeg;base64,", lo quitamos
        if ',' in imagen_b64:
            imagen_b64 = imagen_b64.split(',')[1]
        
        content = base64.b64decode(imagen_b64)

        # 3. Llamada a Google Cloud Vision API
        # El cliente buscará automáticamente la llave en la variable de entorno que configuramos en Render
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=content)
        
        # Solicitamos detección de texto
        response = client.text_detection(image=image)
        annotations = response.text_annotations

        if not annotations:
            return Response({'error': 'No se detectó ningún texto en la etiqueta. Intenta enfocar mejor.'}, status=400)

        # La primera anotación contiene todo el bloque de texto detectado
        texto_extraido = annotations[0].description.upper()

        if response.error.message:
            raise Exception(f"Error de Google Vision: {response.error.message}")

        # 4. Buscar coincidencias en el catálogo de productos (PostgreSQL)
        producto_encontrado = None
        productos = Producto.objects.all()

        for p in productos:
            nombre_comercial_upper = p.nombre_comercial.upper()
            ingrediente_upper = p.ingrediente_activo.upper()
            
            # Verificamos si el nombre o ingrediente están presentes en lo leído por la IA
            if nombre_comercial_upper in texto_extraido or ingrediente_upper in texto_extraido:
                producto_encontrado = {
                    'id': p.id,
                    'nombre_comercial': p.nombre_comercial,
                    'presentacion': p.presentacion,
                    'stock_actual': p.stock_actual
                }
                break # Match encontrado, salimos del bucle

        # 5. Respuesta al Frontend
        return Response({
            'texto_bruto': texto_extraido,
            'producto_detectado': producto_encontrado,
            'mensaje': 'Producto identificado correctamente' if producto_encontrado else 'Texto leído, pero no coincide con el catálogo'
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