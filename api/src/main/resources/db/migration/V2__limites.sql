-- El límite de altas por IP de las funciones de Vercel (no tienen memoria
-- entre llamadas). No se guarda la IP, solo su huella (SHA-256), y cada fila
-- se borra a los diez minutos.
create table limites (
	clave varchar(64) primary key,
	desde timestamp(6) with time zone not null,
	veces integer not null
);
