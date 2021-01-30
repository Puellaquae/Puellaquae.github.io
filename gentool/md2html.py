import os

class Page:
    sub = ''
    tag = []
    created_date = ''
    modified_date = ''
    title = ''

def trans2page(file_path):
    file = open(file_path,encoding='utf-8')
    page = Page()
    entry = False
    for line in file.readlines():
        if not entry and line.startswith('!'):

files = os.listdir('article')
