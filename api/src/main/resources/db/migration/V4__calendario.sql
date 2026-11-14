-- La dirección del calendario de plazos de cada persona: aleatoria y aparte
-- de su token (el token da acceso a cambiar el negocio y darse de baja; esta
-- solo a la lista de plazos, porque los programas de calendario guardan y a
-- veces comparten sus direcciones). Se crea la primera vez que abre su panel.
alter table suscriptores add column calendario varchar(43) unique;
