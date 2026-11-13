-- Cada cuánto recibe los avisos: cada día que haya algo (DIARIA) o como mucho
-- un correo a la semana con todo junto (SEMANAL)
alter table suscriptores add column frecuencia varchar(7) not null default 'DIARIA';

-- Para avisar si cambia el plazo de una ayuda ya enviada o seguida:
--   cierre   el plazo que tenía la última vez que se avisó de ella (AAAA-MM-DD;
--            '' si no tenía fecha; null si aún no se ha mirado, en las seguidas)
--   cambio   hay un cambio de plazo por avisar (cierre guarda el de antes)
--   seguida  la sigue desde el radar (una guardada), no se le envió como nueva
alter table avisos add column cierre varchar(10);
alter table avisos add column cambio boolean not null default false;
alter table avisos add column seguida boolean not null default false;

create index avisos_con_cambio on avisos (suscriptor_id) where cambio;

-- Cuántas veces se guarda cada ayuda en el radar, por día. Sin ningún dato de
-- quien la guarda: solo el código de la ayuda y la cuenta
create table guardadas (
	dia date not null,
	codigo varchar(20) not null,
	veces integer not null,
	primary key (dia, codigo)
);
