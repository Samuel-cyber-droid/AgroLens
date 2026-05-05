import easyocr
import logging

logger = logging.getLogger(__name__)

# Inicializamos el lector fuera de la función.
# Esto es vital para que el modelo se cargue en la memoria RAM una sola vez al arrancar Django,
# y no tenga que recargarse cada vez que alguien toma una foto.
# gpu=False asegura que funcione perfectamente usando el procesador (CPU) de tu computadora.
lector = easyocr.Reader(['es', 'en'], gpu=False)

def extraer_texto_de_imagen(imagen_bytes):
    """
    Procesa la imagen localmente usando redes neuronales (EasyOCR) para extraer el texto.
    """
    try:
        # EasyOCR lee directamente los bytes de la foto que manda React/Postman
        resultados = lector.readtext(imagen_bytes)
        
        if not resultados:
            return ""
            
        # EasyOCR devuelve una lista. Cada elemento tiene: [coordenadas, texto, nivel_de_confianza]
        # Extraemos solo el texto (la posición 1) y lo unimos en un solo párrafo grande
        textos_encontrados = [resultado[1] for resultado in resultados]
        texto_completo = " ".join(textos_encontrados)
        
        return texto_completo
        
    except Exception as e:
        logger.error(f"Fallo al procesar imagen con EasyOCR: {str(e)}")
        return None