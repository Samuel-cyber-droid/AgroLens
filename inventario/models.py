from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Categoria(models.Model):
    """Clasificación del producto (Ej. Herbicida, Fungicida, Fertilizante)"""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nombre

class Producto(models.Model):
    """Catálogo central de agroquímicos"""
    # El OCR de Cloud Vision leerá principalmente estos dos campos:
    nombre_comercial = models.CharField(max_length=200, db_index=True)
    ingrediente_activo = models.CharField(max_length=200, db_index=True)
    
    categoria = models.ForeignKey(Categoria, on_delete=models.RESTRICT, related_name='productos')
    presentacion = models.CharField(max_length=100, help_text="Ej. Botella 1L, Saco 20kg, Bidón 5L")
    
    # Stock actual calculado. No debe modificarse a mano, sino mediante movimientos.
    stock_actual = models.PositiveIntegerField(default=0)
    
    # Auditoría básica
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        # Evita productos duplicados con la misma presentación
        unique_together = ('nombre_comercial', 'presentacion')

    def __str__(self):
        return f"{self.nombre_comercial} - {self.ingrediente_activo} ({self.presentacion})"

class MovimientoInventario(models.Model):
    """
    Bitácora Inmutable (Append-Only) para trazabilidad.
    Cumple con los requisitos de auditoría de COFEPRIS/SADER.
    """
    TIPO_MOVIMIENTO = [
        ('ENTRADA', 'Entrada (Recepción)'),
        ('SALIDA', 'Salida (Despacho/Venta)'),
        ('AJUSTE', 'Ajuste (Merma o Corrección)'),
    ]
    
    producto = models.ForeignKey(Producto, on_delete=models.RESTRICT, related_name='movimientos')
    usuario = models.ForeignKey(User, on_delete=models.RESTRICT, help_text="Operador que escaneó/registró el movimiento")
    
    tipo = models.CharField(max_length=10, choices=TIPO_MOVIMIENTO)
    cantidad = models.PositiveIntegerField()
    fecha_movimiento = models.DateTimeField(default=timezone.now, db_index=True)
    notas = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.get_tipo_display()} | {self.producto.nombre_comercial} | Cantidad: {self.cantidad}"
    
    class Meta:
        ordering = ['-fecha_movimiento']