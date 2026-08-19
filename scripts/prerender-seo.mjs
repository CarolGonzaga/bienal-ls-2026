import {
    mkdir,
    readFile,
    writeFile
} from 'node:fs/promises'

import path from 'node:path'

const ROOT = process.cwd()
const DIST = path.join(ROOT, 'dist')
const INDEX = path.join(DIST, 'index.html')

const BASE =
    'https://www.lendosaficos.com.br/mapasaficobienal'

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function setTitle(html, title) {
    return html.replace(
        /<title>[\s\S]*?<\/title>/i,
        `<title>${escapeHtml(title)}</title>`
    )
}

function setMeta(html, name, content) {
    const regex = new RegExp(
        `<meta\\s+name=["']${name}["'][^>]*>`,
        'i'
    )

    const tag =
        `<meta name="${name}" content="${escapeHtml(content)}" />`

    if (regex.test(html)) {
        return html.replace(regex, tag)
    }

    return html.replace(
        '</head>',
        `  ${tag}\n</head>`
    )
}

function setCanonical(html, url) {
    const regex =
        /<link\s+rel=["']canonical["'][^>]*>/i

    const tag =
        `<link rel="canonical" href="${url}" />`

    if (regex.test(html)) {
        return html.replace(regex, tag)
    }

    return html.replace(
        '</head>',
        `  ${tag}\n</head>`
    )
}

function replaceRoot(html, content) {
    return html.replace(
        /<div\s+id=["']root["']>\s*<\/div>/i,
        `<div id="root">${content}</div>`
    )
}

function landingMarkup() {
    return `
    <main>
      <section>
        <p>Bienal do Livro de São Paulo 2026</p>

        <h1>
          Mapa Sáfico da Bienal do Livro de São Paulo 2026
        </h1>

        <p>
          Encontre editoras, estandes, livros e programação
          de interesse do público sáfico e planeje sua visita
          usando o mapa interativo do Lendo Sáficos.
        </p>

        <a href="/mapasaficobienal/login">
          Abrir Mapa Sáfico
        </a>
      </section>

      <section>
        <h2>Encontre editoras e estandes</h2>
        <p>
          Pesquise expositores e encontre seus destinos
          dentro da Bienal.
        </p>

        <h2>Monte sua rota pela Bienal</h2>
        <p>
          Organize os locais que deseja visitar durante
          o evento.
        </p>

        <h2>Consulte a programação</h2>
        <p>
          Veja atividades e planeje melhor sua visita
          à Bienal do Livro.
        </p>
      </section>
    </main>
  `
}

function publicPage(template) {
    let html = template

    html = setTitle(
        html,
        'Mapa da Bienal do Livro SP 2026: Editoras e Livros Sáficos | Lendo Sáficos'
    )

    html = setMeta(
        html,
        'description',
        'Explore o Mapa Sáfico da Bienal do Livro de São Paulo 2026 e encontre editoras, estandes, livros, programação e rotas para planejar sua visita.'
    )

    html = setMeta(
        html,
        'robots',
        'index, follow'
    )

    html = setCanonical(
        html,
        BASE
    )

    html = replaceRoot(
        html,
        landingMarkup()
    )

    return html
}

function privatePage(
    template,
    title
) {
    let html = template

    html = setTitle(
        html,
        title
    )

    html = setMeta(
        html,
        'robots',
        'noindex, nofollow'
    )

    /*
     * Não queremos que uma canonical da landing pública
     * permaneça nessas páginas privadas.
     */
    html = html.replace(
        /<link\s+rel=["']canonical["'][^>]*>\s*/i,
        ''
    )

    return html
}

async function writePrivateRoute(
    pathname,
    html
) {
    const dir = path.join(
        DIST,
        ...pathname.split('/').filter(Boolean)
    )

    await mkdir(
        dir,
        { recursive: true }
    )

    await writeFile(
        path.join(dir, 'index.html'),
        html,
        'utf8'
    )
}

async function main() {
    console.log(
        '[SEO MAPA] Iniciando prerender...'
    )

    const template = await readFile(
        INDEX,
        'utf8'
    )

    await writeFile(
        INDEX,
        publicPage(template),
        'utf8'
    )

    await writePrivateRoute(
        '/login',
        privatePage(
            template,
            'Entrar | Mapa Sáfico'
        )
    )

    await writePrivateRoute(
        '/perfil',
        privatePage(
            template,
            'Perfil | Mapa Sáfico'
        )
    )

    await writePrivateRoute(
        '/recuperar-senha',
        privatePage(
            template,
            'Recuperar senha | Mapa Sáfico'
        )
    )

    await writePrivateRoute(
        '/admin',
        privatePage(
            template,
            'Painel administrativo | Mapa Sáfico'
        )
    )

    console.log(
        '[SEO MAPA] Prerender concluído.'
    )
}

main().catch(error => {
    console.error(error)
    process.exit(1)
})