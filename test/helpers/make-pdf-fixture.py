"""Regenerate the synthetic PDF fixture (requires PyMuPDF, no personal data)."""
from pathlib import Path
import pymupdf

doc = pymupdf.open()
for n in range(6):
    page = doc.new_page(width=595, height=842)
    page.insert_text((40, 25), 'REPEATED HEADER', fontsize=10)
    page.insert_text((40, 820), f'REPEATED FOOTER {n + 1}', fontsize=10)
    page.insert_text((40, 85), f'Section {n + 1}', fontsize=18)
page = doc[0]
page.insert_text((40, 130), 'LEFT START\nLeft column content.\nLEFT END', fontsize=12)
page.insert_text((320, 130), 'RIGHT START\nRight column content.\nRIGHT END', fontsize=12)
# Una fotografía, guardada como JPEG dentro del PDF igual que la guardaría
# cualquier maquetador: al convertirla no debe rasterizarse de nuevo como PNG.
foto = pymupdf.open()
lienzo = foto.new_page(width=200, height=150)
for i, color in enumerate([(.9,.4,.2),(.2,.6,.8),(.3,.8,.4),(.8,.8,.2)]):
    lienzo.draw_circle((40 + i * 40, 75), 55, color=None, fill=color, fill_opacity=.75)
page.insert_image(pymupdf.Rect(40, 300, 340, 525), stream=lienzo.get_pixmap(dpi=110).tobytes('jpg'))
foto.close()
page = doc[1]
for y in [130,160,190,220]: page.draw_line((40,y),(500,y))
for x in [40,270,500]: page.draw_line((x,130),(x,220))
for x,y,text in [(50,150,'Item'),(280,150,'Value'),(50,180,'Apples'),(280,180,'12'),(50,210,'Pears'),(280,210,'24')]: page.insert_text((x,y),text)
page = doc[3]
# A single symbol inside a cell must not turn the whole table into an image.
for y in [130,160,190,220]: page.draw_line((40,y),(500,y))
for x in [40,270,500]: page.draw_line((x,130),(x,220))
for x,y,text in [(50,150,'Variable'),(280,150,'Total'),(50,180,'x'),(280,180,'12'),(50,210,'y')]: page.insert_text((x,y),text)
page.insert_text((280,210),'=',fontname='symb')
page.insert_text((295,210),'24')
page = doc[4]
# Como imprime un navegador: cada borde de celda es un rectángulo relleno y no
# hay una sola línea vertical, así que la rejilla hay que reconstruirla.
for y in [140,170,200]:
    for x0,x1 in [(40,270),(270,500)]: page.draw_rect(pymupdf.Rect(x0,y,x1,y+.75), color=None, fill=(.8,.8,.8))
for x,y,text in [(50,135,'Atajo'),(280,135,'Efecto'),(50,165,'Ctrl+B'),(280,165,'Negrita'),(50,195,'Ctrl+I'),(280,195,'Cursiva')]: page.insert_text((x,y),text)
page = doc[5]
# Estilo booktabs: reglas de ancho completo y ni un borde de columna, así que
# las columnas solo se deducen del corredor que deja el texto.
for y in [140,170,230]: page.draw_line((40,y),(500,y))
for x,y,text in [(50,135,'Producto'),(300,135,'Unidades'),(50,165,'Manzanas'),(300,165,'12'),(50,195,'Peras'),(300,195,'24'),(50,225,'Uvas'),(300,225,'36')]: page.insert_text((x,y),text)
page = doc[2]
page.insert_text((40, 130), 'Formula example', fontsize=12)
page.insert_text((40, 165), 'x', fontsize=18)
page.insert_text((55, 165), '=', fontname='symb', fontsize=18)
page.insert_text((80, 165), '2', fontsize=18)
page.insert_text((40, 210), 'Text after formula.', fontsize=12)
# Séptima página: más imágenes de las que la vista previa enseña, para que se
# vea que las demás quedan nombradas y aun así se importan.
page = doc.new_page(width=595, height=842)
page.insert_text((40, 25), 'REPEATED HEADER', fontsize=10)
page.insert_text((40, 85), 'Gallery', fontsize=18)
page.insert_text((40, 120), 'Trece miniaturas seguidas.', fontsize=12)
for i in range(13):
    tarjeta = pymupdf.open()
    lienzo = tarjeta.new_page(width=60, height=45)
    lienzo.draw_rect(pymupdf.Rect(0, 0, 60, 45), color=None, fill=(i / 13, .5, 1 - i / 13))
    x, y = 40 + (i % 4) * 130, 160 + (i // 4) * 110
    page.insert_image(pymupdf.Rect(x, y, x + 120, y + 90), stream=lienzo.get_pixmap(dpi=96).tobytes('jpg'))
    tarjeta.close()

# Octava página, tras la galería: la rejilla decorativa que un programa de diseño sangra hasta
# el borde del papel y pinta por debajo del texto. No es una tabla, pero
# PyMuPDF la lee como una que ocupa la hoja entera, y MuPDF marca como tachado
# todo lo que sus reglas cruzan.
page = doc.new_page(width=595, height=842)
for x in range(0, 596, 42): page.draw_line((x, 0), (x, 842), color=(.2, .25, .4), width=.5)
for y in range(0, 843, 42): page.draw_line((0, y), (595, y), color=(.2, .25, .4), width=.5)
page.insert_text((60, 126), 'REJILLA DECORATIVA', fontsize=24)
page.insert_text((60, 210), 'Este parrafo cruza las reglas de la rejilla y debe', fontsize=14)
page.insert_text((60, 252), 'llegar entero, sin celdas y sin tachados.', fontsize=14)
# Y una caja de color con texto dentro, como las de cualquier guía maquetada:
# el conversor aparta el texto que cae dentro de un grupo de vectores, y en
# una página así es donde vive el cuerpo del documento.
page.draw_rect(pymupdf.Rect(50, 320, 545, 470), color=(.1, .6, .9), fill=(.93, .97, 1), width=2)
page.insert_text((70, 360), 'TRUCO', fontsize=16)
page.insert_text((70, 404), 'El texto de esta caja de color tambien tiene que', fontsize=13)
page.insert_text((70, 436), 'llegar al resultado.', fontsize=13)

# Novena página: un horario semanal, la tabla real que más se parece a una
# rejilla —paso uniforme en los dos ejes— pero dentro de los márgenes y con el
# texto entre las reglas, no encima. Tiene que seguir siendo una tabla.
page = doc.new_page(width=595, height=842)
for y in range(120, 521, 100): page.draw_line((40, y), (520, y))
for x in range(40, 521, 120): page.draw_line((x, 120), (x, 520))
for fila, textos in enumerate([['Hora', 'Lunes', 'Martes', 'Miercoles'],
                               ['09:00', 'Lengua', 'Fisica', 'Quimica'],
                               ['11:00', 'Historia', 'Dibujo', 'Musica'],
                               ['13:00', 'Ingles', 'Latin', 'Biologia']]):
    for columna, texto in enumerate(textos):
        page.insert_text((50 + columna * 120, 170 + fila * 100), texto)

# Décima página: una tabla ancha que casi cubre la hoja. Descartar una tabla
# por su tamaño era la regla que sí daba falsos positivos.
page = doc.new_page(width=595, height=842)
for y in range(100, 701, 75): page.draw_line((30, y), (565, y))
for x in range(30, 566, 89): page.draw_line((x, 100), (x, 700))
for fila in range(8):
    for columna in range(6):
        page.insert_text((36 + columna * 89, 140 + fila * 75), f'C{columna}F{fila}', fontsize=9)

# Undécima página: las dos tablas sin título de columna. Markdown no tiene tabla
# sin cabecera, así que el conversor asciende la primera fila y bautiza «Col2»
# cada celda que encuentra vacía.
page = doc.new_page(width=595, height=842)
page.insert_text((40, 100), 'Tablas sin cabecera', fontsize=16)
# Un formulario: etiquetas a la izquierda, huecos por rellenar a la derecha. No
# hay cabecera ninguna, y la primera fila vale tanto como las otras dos.
for y in range(140, 291, 50): page.draw_line((40, y), (500, y))
for x in (40, 250, 500): page.draw_line((x, 140), (x, 290))
for fila, texto in enumerate(['Titulo', 'Curso', 'Asignatura']):
    page.insert_text((50, 170 + fila * 50), texto)
# Una tabla de doble entrada: la esquina de arriba a la izquierda está vacía a
# propósito y las demás celdas de esa fila sí titulan su columna. Aquí la
# primera fila sí es una cabecera, y tiene que seguir siéndolo.
for y in range(360, 511, 50): page.draw_line((40, y), (500, y))
for x in (40, 200, 350, 500): page.draw_line((x, 360), (x, 510))
page.insert_text((210, 390), 'Saber')
page.insert_text((360, 390), 'Ambito')
for fila, texto in enumerate(['1', '2']):
    page.insert_text((50, 440 + fila * 50), texto)

path=Path(__file__).resolve().parents[1]/'fixtures'/'pdf-import.pdf'
doc.save(path,deflate=True)

# Doscientas diez páginas mínimas: el conversor ya no tiene tope y esto lo
# comprueba sin pedir un archivo pesado.
largo = pymupdf.open()
for n in range(210):
    page = largo.new_page(width=595, height=842)
    page.insert_text((50, 100), f'Pagina larga numero {n + 1}', fontsize=12)
    # Una cabecera de capítulo: cubre veinte páginas, ni de lejos la mitad del
    # documento, y aun así es texto de margen que sobra en el resultado.
    if 50 <= n < 70:
        page.insert_text((50, 25), 'CAPITULO SEGUNDO', fontsize=10)
largo.save(Path(__file__).resolve().parents[1] / 'fixtures' / 'pdf-long.pdf', deflate=True)
largo.close()

# Una página que visualmente contiene texto pero cuyo PDF no conserva ninguna
# capa textual: es el caso mínimo para la regresión del OCR.
source = pymupdf.open()
page = source.new_page(width=595, height=842)
page.insert_text((60, 150), 'DOCUMENTO ESCANEADO', fontsize=28)
page.insert_text((60, 210), 'La celula contiene informacion genetica.', fontsize=20)
page.insert_text((60, 250), 'Ferreras aparece en esta pagina de prueba.', fontsize=20)
pixmap = page.get_pixmap(dpi=200, colorspace=pymupdf.csGRAY, alpha=False)
scanned = pymupdf.open()
page = scanned.new_page(width=595, height=842)
page.insert_image(page.rect, stream=pixmap.tobytes('png'))

# Segunda página: una lámina a toda página, sin una sola letra. También llega
# al OCR, que no leerá nada, y la imagen debe sobrevivir a la conversión.
plate = pymupdf.open()
page = plate.new_page(width=595, height=842)
page.draw_circle((300, 400), 180, color=(0, 0, 0), fill=(.2, .4, .8), width=3)
page.draw_rect(pymupdf.Rect(120, 560, 480, 700), color=(0, 0, 0), fill=(.9, .7, .2), width=3)
pixmap = page.get_pixmap(dpi=150, alpha=False)
page = scanned.new_page(width=595, height=842)
page.insert_image(page.rect, stream=pixmap.tobytes('png'))
plate.close()

# Tercera página: un escaneo al que alguien añadió después una referencia
# vectorial. Conserva una pizca de texto extraíble sin dejar de ser una imagen.
source = pymupdf.open()
page = source.new_page(width=595, height=842)
page.insert_text((60, 150), 'ANEXO DIGITALIZADO', fontsize=28)
page.insert_text((60, 210), 'El expediente incluye la resolucion completa.', fontsize=20)
page.insert_text((60, 250), 'Sequeiros firma la ultima diligencia del anexo.', fontsize=20)
pixmap = page.get_pixmap(dpi=200, colorspace=pymupdf.csGRAY, alpha=False)
page = scanned.new_page(width=595, height=842)
page.insert_image(page.rect, stream=pixmap.tobytes('png'))
page.insert_text((60, 430), 'Ref. 4712-B', fontsize=11)

# Cuarta página: una portada digital, imagen grande y poco texto. Cumple el
# perfil de un escaneo, pero su texto es de verdad y no debe perderse.
page = scanned.new_page(width=595, height=842)
page.draw_rect(pymupdf.Rect(60, 300, 535, 700), color=(0, 0, 0), fill=(.15, .55, .35), width=2)
pixmap = page.get_pixmap(dpi=150, alpha=False)
page = scanned[-1]
page.insert_image(page.rect, stream=pixmap.tobytes('png'))
page.insert_text((60, 200), 'Portada del informe anual', fontsize=22)

ocr_path = Path(__file__).resolve().parents[1] / 'fixtures' / 'pdf-ocr.pdf'
scanned.save(ocr_path, deflate=True)
