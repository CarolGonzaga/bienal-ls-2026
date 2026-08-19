import React from 'react'
import {
    BookOpen,
    CalendarDays,
    MapPinned,
    Route,
    Search,
    Sparkles
} from 'lucide-react'
import { appPath } from '../lib/paths'

export default function PublicMapLanding() {
    return (
        <div className="brand-shell site-theme min-h-[100dvh] bg-[#fff8fb] text-[#56132f]">
            <header className="border-b border-[#f2d6e3] bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
                    <a
                        href="https://www.lendosaficos.com.br/"
                        aria-label="Lendo Sáficos"
                        className="flex items-center gap-3"
                    >
                        <img
                            src={appPath('/logo-completo.png')}
                            alt="Lendo Sáficos"
                            className="h-12 w-auto object-contain"
                        />
                    </a>

                    <a
                        href={appPath('/login')}
                        className="rounded-full bg-[#d43276] px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-pink-900/10 transition hover:scale-[1.02]"
                    >
                        Entrar no mapa
                    </a>
                </div>
            </header>

            <main>
                <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[1fr_1.1fr] lg:py-20">
                    <div>
                        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ffe8f2] px-4 py-2 text-sm font-extrabold text-[#b72a69]">
                            <Sparkles className="h-4 w-4" />
                            Bienal do Livro de São Paulo 2026
                        </p>

                        <h1 className="max-w-3xl text-4xl font-black leading-tight text-[#4f1534] sm:text-5xl lg:text-6xl">
                            Mapa Sáfico da Bienal do Livro de São Paulo 2026
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#774760]">
                            Encontre editoras, estandes, livros e programação de interesse
                            do público sáfico e planeje sua visita à Bienal usando o mapa
                            interativo do Lendo Sáficos.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <a
                                href={appPath('/login')}
                                className="inline-flex items-center gap-2 rounded-2xl bg-[#d43276] px-6 py-3.5 font-black text-white shadow-xl shadow-pink-900/15 transition hover:-translate-y-0.5"
                            >
                                <MapPinned className="h-5 w-5" />
                                Abrir Mapa Sáfico
                            </a>

                            <a
                                href="#como-funciona"
                                className="inline-flex items-center gap-2 rounded-2xl border border-[#e9bbcf] bg-white px-6 py-3.5 font-bold text-[#7c3155]"
                            >
                                Como funciona
                            </a>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-[2rem] border border-[#f0ccdc] bg-white p-3 shadow-2xl shadow-[#7e1641]/10">
                        <img
                            src={appPath('/mapa/MAPA.png')}
                            alt="Mapa da Bienal do Livro de São Paulo 2026 com pavilhões, ruas, estandes e acessos"
                            className="aspect-[4/3] w-full rounded-[1.5rem] bg-white object-contain"
                            loading="eager"
                        />
                    </div>
                </section>

                <section
                    id="como-funciona"
                    className="border-y border-[#f2d6e3] bg-white py-16"
                >
                    <div className="mx-auto max-w-7xl px-5">
                        <div className="max-w-2xl">
                            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#c43170]">
                                Planeje sua visita
                            </p>

                            <h2 className="mt-3 text-3xl font-black text-[#4f1534] sm:text-4xl">
                                Tudo que você precisa para explorar a Bienal
                            </h2>

                            <p className="mt-4 leading-relaxed text-[#774760]">
                                Use as ferramentas do Mapa Sáfico para descobrir lugares,
                                encontrar expositores e organizar seu percurso pelo evento.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Feature
                                icon={Search}
                                title="Encontre editoras e estandes"
                                text="Pesquise editoras e expositores e encontre rapidamente a localização do estande no mapa."
                            />

                            <Feature
                                icon={MapPinned}
                                title="Explore o mapa da Bienal"
                                text="Veja pavilhões, ruas, portões, serviços e estandes em um mapa interativo feito para facilitar sua visita."
                            />

                            <Feature
                                icon={Route}
                                title="Monte sua rota"
                                text="Escolha seu ponto de partida e os lugares que deseja visitar para organizar seu percurso pela Bienal."
                            />

                            <Feature
                                icon={CalendarDays}
                                title="Confira a programação"
                                text="Consulte atividades e organize melhor o seu dia durante o evento."
                            />
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-5 py-16">
                    <div className="grid gap-8 rounded-[2rem] bg-[#56132f] p-8 text-white md:grid-cols-[1fr_auto] md:items-center md:p-12">
                        <div>
                            <BookOpen className="mb-5 h-8 w-8 text-[#f6a6ca]" />

                            <h2 className="text-3xl font-black">
                                Descubra a Bienal pelo universo sáfico
                            </h2>

                            <p className="mt-4 max-w-2xl leading-relaxed text-[#f5dce7]">
                                O Mapa Sáfico reúne informações para ajudar leitoras a
                                encontrar editoras, livros, estandes e atividades de interesse
                                durante a Bienal do Livro de São Paulo 2026.
                            </p>
                        </div>

                        <a
                            href={appPath('/login')}
                            className="inline-flex justify-center rounded-2xl bg-[#f5a1c6] px-6 py-3.5 font-black text-[#56132f]"
                        >
                            Acessar mapa
                        </a>
                    </div>
                </section>
            </main>

            <footer className="border-t border-[#f2d6e3] bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-[#87536e] sm:flex-row sm:items-center sm:justify-between">
                    <span>© 2026 Lendo Sáficos</span>

                    <a
                        href="https://www.lendosaficos.com.br/"
                        className="font-bold text-[#bd2f6c]"
                    >
                        lendosaficos.com.br
                    </a>
                </div>
            </footer>
        </div>
    )
}

function Feature({ icon: Icon, title, text }) {
    return (
        <article className="rounded-3xl border border-[#f2d6e3] bg-[#fff9fc] p-6">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffe3ef] text-[#c72e6e]">
                <Icon className="h-5 w-5" />
            </div>

            <h3 className="text-lg font-black text-[#56132f]">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-[#805269]">
                {text}
            </p>
        </article>
    )
}