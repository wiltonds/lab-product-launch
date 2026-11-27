-- Rode uma vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- Lista "leads para chamar": abra no celular em Table Editor > leads_para_chamar.
-- Cada linha traz um link do WhatsApp (wa.me) com a mensagem pronta. Tocar no link abre a conversa;
-- a mensagem só sai quando você aperta enviar. Funciona com o WhatsApp normal ou o Business.

-- Codifica texto para usar dentro de um link (espaços, acentos, vírgulas...).
create or replace function public.urlencode(t text) returns text
language sql immutable as $$
  select coalesce(string_agg(
    case when ch ~ '^[A-Za-z0-9_.~-]$' then ch
         else regexp_replace(upper(encode(convert_to(ch, 'UTF8'), 'hex')), '(..)', '%\1', 'g') end,
    '' order by i), '')
  from regexp_split_to_table(t, '') with ordinality as x(ch, i)
$$;

create or replace view public.leads_para_chamar as
select
  l.id,
  to_char(l.criado_em at time zone 'America/Maceio', 'DD/MM HH24:MI') as quando,
  l.nome,
  l.atividade,
  l.municipio,
  l.bairro,
  l.indice,
  l.origem,
  l.status,
  'https://wa.me/55' || l.whatsapp || '?text=' || public.urlencode(
    'Oi, ' || split_part(trim(l.nome), ' ', 1) || '! Aqui é o Wilton, do Vinga. '
    || 'Vi que você gerou o plano do seu negócio'
    || coalesce(' (' || lower(l.atividade) || coalesce(' em ' || l.municipio, '') || ')', '')
    || '. Conseguiu abrir o PDF? Se quiser, te explico em 10 minutos o que mais pesou na sua nota '
    || 'e o que eu faria primeiro no seu lugar.'
  ) as chamar_no_whatsapp
from public.leads l
where l.status in ('novo', 'contatado')
order by l.criado_em desc;

-- Só você (pelo painel) vê a lista. Pelo app/API, ninguém lê.
revoke all on public.leads_para_chamar from anon, authenticated;
revoke all on function public.urlencode(text) from anon, authenticated;
