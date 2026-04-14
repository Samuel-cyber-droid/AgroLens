from django.contrib import admin
from .models import Categoria, Producto, MovimientoInventario

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')
    search_fields = ('nombre',)

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    # Columnas que se verán en la tabla principal
    list_display = ('nombre_comercial', 'ingrediente_activo', 'presentacion', 'stock_actual')
    # Filtros laterales
    list_filter = ('categoria',)
    # Barra de búsqueda para el OCR
    search_fields = ('nombre_comercial', 'ingrediente_activo')
    # El stock es de solo lectura (se altera con movimientos)
    readonly_fields = ('stock_actual',)

@admin.register(MovimientoInventario)
class MovimientoInventarioAdmin(admin.ModelAdmin):
    list_display = ('producto', 'tipo', 'cantidad', 'fecha_movimiento', 'usuario')
    list_filter = ('tipo', 'fecha_movimiento')
    search_fields = ('producto__nombre_comercial',)
    readonly_fields = ('fecha_movimiento',)