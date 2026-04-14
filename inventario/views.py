# inventario/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from .utils import extraer_texto_de_imagen
from .models import Producto
from .serializers import ProductoSerializer

@api_view(['POST'])
@permission_classes([IsAuthenticated]) # Protegido con JWT
def escanear_etiqueta(request):
    if 'imagen' not in request.FILES:
        return Response({'error': 'No se adjuntó ninguna imagen.'}, status=status.HTTP_400_BAD_REQUEST)

    imagen_file = request.FILES['imagen']
    imagen_bytes = imagen_file.read()

    # 1. Enviar a Google Cloud Vision
    texto_extraido = extraer_texto_de_imagen(imagen_bytes)
    
    if texto_extraido is None:
        return Response({'error': 'Fallo al procesar la imagen con la IA.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    if not texto_extraido.strip():
         return Response({'mensaje': 'No se detectó texto en la imagen.', 'coincidencias': []}, status=status.HTTP_200_OK)

    # 2. Limpiar el texto para la búsqueda (pasarlo a minúsculas, por ejemplo)
    texto_limpio = texto_extraido.lower()

    # 3. Lógica de comparación con la Base de Datos
    # Buscamos si ALGUNA palabra clave del producto está en el texto gigante que leyó la cámara
    productos_db = Producto.objects.all()
    coincidencias = []

    for producto in productos_db:
        # Verificamos si el nombre o el ingrediente están en el texto extraído
        if (producto.nombre_comercial.lower() in texto_limpio) or \
           (producto.ingrediente_activo.lower() in texto_limpio):
            coincidencias.append(producto)

    # 4. Devolver resultados
    if coincidencias:
        serializer = ProductoSerializer(coincidencias, many=True)
        return Response({
            'mensaje': 'Éxito',
            'texto_bruto': texto_extraido,
            'coincidencias': serializer.data
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'mensaje': 'No se encontraron coincidencias en el inventario.',
            'texto_bruto': texto_extraido,
            'coincidencias': []
        }, status=status.HTTP_200_OK)