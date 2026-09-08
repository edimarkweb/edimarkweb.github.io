"""Regenerate the synthetic PDF fixture (requires PyMuPDF, no personal data)."""
from pathlib import Path
import pymupdf

doc = pymupdf.open()
for n in range(3):
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
page = doc[2]
page.insert_text((40, 130), 'Formula example', fontsize=12)
page.insert_text((40, 165), 'x', fontsize=18)
page.insert_text((55, 165), '=', fontname='symb', fontsize=18)
page.insert_text((80, 165), '2', fontsize=18)
page.insert_text((40, 210), 'Text after formula.', fontsize=12)
path=Path(__file__).resolve().parents[1]/'fixtures'/'pdf-import.pdf'
doc.save(path,deflate=True)
