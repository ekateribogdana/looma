# Исходники (не публикуются)

Папка начинается с `_`, поэтому GitHub Pages (Jekyll) её не выкладывает на сайт.

## prototype/ — исходник живого прототипа `prototype/index.html`

- `app.html` — разметка, стили и логика прототипа; картинки в нём записаны как `{{IMG000}}`…
- `imgs.json` — сами картинки (data:URI) по ключам `IMGnnn`
- `build.py` — сборка: подставляет пути и раскладывает картинки файлами в `prototype/img/`

Пересобрать и выложить:

```
cd _source/prototype
python3 build.py ../../prototype/index.html
cd ../.. && git add prototype && git commit -m "…" && git push
```

Правки делать в `app.html` (или в `imgs.json` для картинок), не в `prototype/index.html` — он перезаписывается сборкой.
`qa.js` — автопроверка сценариев прототипа (Node + Playwright, см. `package.json`).

## cv/ — исходник PDF-резюме

`cv.html` + `photo-site.jpg`. PDF печатается из Chrome/Chromium без колонтитулов (A4, одна страница) и кладётся в репозиторий сайта как `Bogdanova_Ekaterina_Product_Designer.pdf`.
