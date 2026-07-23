# Segurança

## Implementado

- Sessão assinada por HMAC em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Expiração de sessão e validação do usuário ativo a cada requisição protegida.
- Hash de senha com bcrypt.
- Senhas temporárias aleatórias para novos usuários e redefinições.
- Rate limit de login por combinação IP/e-mail.
- Verificação de papéis `admin`, `subadmin` e `user` nas rotas aplicáveis.
- Allowlist de tabelas e operações para impedir acesso arbitrário via API.
- `SUPABASE_SERVICE_ROLE_KEY` restrita a módulos server-side.
- EmailJS e tokens de correção processados pelo servidor.
- Rota agendada protegida por `CRON_SECRET`.
- Respostas de produção sem stack trace interno.

## Recomendações para ambiente corporativo

1. Use `SESSION_SECRET` com pelo menos 32 bytes aleatórios.
2. Nunca crie variável `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
3. Rotacione segredos que já tenham sido compartilhados fora do Vercel.
4. Ative logs e alertas de autenticação no Vercel/Supabase.
5. Para múltiplas instâncias, substitua o rate limit em memória por Redis/Upstash.
6. Para atualização instantânea entre usuários, implemente Supabase Realtime com autorização autenticada.
7. Revise RLS mesmo com APIs server-side, mantendo o princípio do menor privilégio.
8. Aplique retenção e controle de acesso aos logs de auditoria.
9. Valide os domínios permitidos pelo formulário de correção e pelo EmailJS.
10. Rode análise de dependências e testes de segurança no pipeline do GitHub.

## Comunicação de falha

Por se tratar de sistema interno, qualquer vulnerabilidade deve ser reportada diretamente ao responsável técnico da Premix e não publicada em issue pública.
