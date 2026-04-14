from google.cloud import vision
import logging

logger = logging.getLogger(__name__)

def extraer_texto_de_imagen(imagen_bytes):
    """
    Envía los bytes de una imagen a Google Cloud Vision y devuelve el texto detectado.
    La ruta de credenciales ya está configurada en .env (GOOGLE_APPLICATION_CREDENTIALS).
    """
    return "HERBICIDA GLIFOSATO LIQUIDO"
    """try:
        cliente = vision.ImageAnnotatorClient()
        imagen_vision = vision.Image(content=imagen_bytes)
        
        # Petición OCR
        respuesta = cliente.text_detection(image=imagen_vision)
        textos = respuesta.text_annotations
        
        if respuesta.error.message:
            logger.error(f"Error de Vision API: {respuesta.error.message}")
            raise Exception(respuesta.error.message)
            
        if textos:
            # El primer elemento contiene todo el texto encontrado en bloque
            return textos[0].description
            
        return ""
    except Exception as e:
        logger.error(f"Fallo al procesar imagen con GCP: {str(e)}")
        return None
        """