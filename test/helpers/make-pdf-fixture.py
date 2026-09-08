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
path=Path(__file__).resolve().parents[1]/'fixtures'/'pdf-import.pdf'
doc.save(path,deflate=True)
