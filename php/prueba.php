<?php
   require 'conexion.php';
   $r = $conexion->query('SELECT nombre, correo FROM empleados');
   while ($f = $r->fetch_assoc()) { echo $f['nombre'] . ' - ' . $f['correo'] . '<br>'; }