-- Ya se ha recordado que la ayuda cierra en los próximos días (una vez, dentro
-- de un correo que salía de todas formas)
alter table avisos add column recordado boolean not null default false;
