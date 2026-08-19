# Cadastro e vínculo de autoras

Decisão do projeto: novas contas são criadas manualmente no Supabase Auth. O Mapa Sáfico apenas vincula uma conta existente a um registro de autora por meio do UUID interno.

## Autora que já possui conta no aplicativo

1. Entre no Mapa com uma conta administradora.
2. Abra **Painel administrativo → Autoras**.
3. Se a autora ainda não existir na lista, clique em **Nova autora**, informe nome, primeiro nome e confirme o slug.
4. No card da autora, informe exatamente o e-mail usado pela autora no aplicativo.
5. Clique em **Vincular**.
6. O sistema localiza o UUID em `auth.users`, cria/atualiza `author_accounts` e altera `profiles.role` para `author`.
7. Peça para a autora sair e entrar novamente, ou atualizar o aplicativo. O botão do painel de autora será exibido no header.

Não crie uma segunda conta para o mesmo e-mail.

## Autora que ainda não possui conta

### Opção recomendada: convite pelo Supabase

1. No Supabase Dashboard, abra **Authentication → Users**.
2. Use **Invite user** e informe o e-mail da autora. Esse fluxo depende de o envio de e-mails do projeto estar configurado.
3. A autora abre o convite, define a senha e conclui o cadastro.
4. Depois que ela aparecer em **Authentication → Users**, faça o vínculo pelo painel administrativo do Mapa conforme o procedimento anterior.

### Alternativa: criação manual

1. No Supabase Dashboard, abra **Authentication → Users → Add user → Create new user**.
2. Informe o e-mail e uma senha temporária forte. Marque o e-mail como confirmado somente se você verificou que o endereço pertence à autora.
3. Opcionalmente, adicione User Metadata semelhante a `{"name":"Nome da autora","username":"nome-da-autora"}`.
4. Não envie senha por canal público. Oriente a autora a usar **Recuperar senha** no Mapa para definir uma senha particular.
5. Faça o vínculo no painel administrativo usando o mesmo e-mail.

## Verificações

- O vínculo permanente usa `user_id` UUID, não o e-mail.
- Uma conta só pode estar vinculada a uma autora ativa.
- A role `author` permite enviar rascunhos e solicitações, mas nunca publicar diretamente.
- Perfil, foto, programação e alterações urgentes continuam dependendo de aprovação administrativa.
- Se o painel informar “Nenhuma conta encontrada”, confirme o e-mail em **Authentication → Users** e verifique se as migrations mais recentes foram aplicadas.
