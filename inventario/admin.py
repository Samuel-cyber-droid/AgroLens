from django.contrib import admin
from .models import Categoria, Producto, MovimientoInventario

# Registramos los modelos básicos
admin.site.register(Categoria)
admin.site.register(Producto)
admin.site.register(MovimientoInventario)