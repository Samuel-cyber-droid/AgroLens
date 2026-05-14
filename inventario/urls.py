from django.urls import path
from . import views

urlpatterns = [
    path('escanear/', views.escanear_etiqueta, name='escanear_etiqueta'),
    path('productos/', views.listar_productos, name='listar_productos'),
    path('movimiento/', views.registrar_movimiento, name='registrar_movimiento'), # <- LA NUEVA RUTA
]