from django.urls import path
from . import views

urlpatterns = [
    path('escanear/', views.escanear_etiqueta, name='escanear_etiqueta'),
]