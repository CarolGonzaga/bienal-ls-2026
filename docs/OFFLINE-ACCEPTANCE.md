# Aceite offline obrigatório

O selo “Pronto para uso offline” só cobre a presença técnica do pacote no aparelho. Antes da liberação, execute os testes abaixo em pelo menos um iPhone/Safari e um Android/Chrome reais.

## Reload em modo avião

1. Entre online e use **Preparar para uso offline**.
2. Confirme todos os indicadores e a data da última atualização.
3. Feche totalmente o navegador.
4. Ative modo avião e abra novamente pelo ícone/PWA ou histórico.
5. Teste Home, mapa, busca, expositores, livros, programação, rotas, favoritos, visitas e Passaporte.
6. Feche e reabra ainda offline; dados pessoais e carimbos devem permanecer.
7. Faça logout; dados pessoais e fila da conta devem desaparecer, mas o conteúdo público pode permanecer.

## API indisponível

Simule separadamente timeout, network error, HTTP 500, 502, 503, 401 e 429. Com cache válido, telas públicas não podem ficar vazias. Erros permanentes 401/403 não devem ser reenviados indefinidamente; erros transitórios entram em fila quando aplicável.

## QR e código manual

Execute o mesmo código pelos dois caminhos. Teste câmera permitida, negada, ausente e ocupada; QR comum, URL, payload incompleto, versão desconhecida, código inexistente e código de outra autora. Nenhuma imagem da câmera pode sair do aparelho. Após reconectar, confirme um único registro em `passport_stamps` e remoção do plaintext da fila local.

## Limitação física comunicada

Offline, confirme a mensagem de contingência e a data da última sincronização. Uma alteração criada depois do último download não pode chegar a um aparelho sem rede.
