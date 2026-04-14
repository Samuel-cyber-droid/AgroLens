# inventario/serializers.py
from rest_framework import serializers
from .models import Producto

class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')

    class Meta:
        model = Producto
        fields = ['id', 'nombre_comercial', 'ingrediente_activo', 'presentacion', 'stock_actual', 'categoria_nombre']