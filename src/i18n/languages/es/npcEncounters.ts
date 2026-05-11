import type { NpcTranslations } from '../../types.js';
export const NPC_ENCOUNTERS_ES: NpcTranslations = {
  'freak-joey': {
    pages: [
      'Sale de las profundidades oscuras con una sonrisa demasiado ansiosa para pertenecer a algo vivo. Las habitaciones a su alrededor se callan de la manera en que lo hacen las antiguas capillas cuando alguien entra llevando asesinato como un sacramento.',
      '"Me llaman Freak Joey. No porque nací mal. Porque seguí acordándome de volverse cada vez más mal cada vez que los túneles me preguntaron."',
      '"Acepta el duelo. Que la piedra escuche si tu coraje es un principio vivo o simplemente un ruido que hace tu cuerpo antes de ser abierto."',
    ],
    acceptLabel: 'Duelo',
    rejectLabel: 'Rechazar',
  },
  'lindsey-wanderer': {
    pages: [
      'Lindsey espera en la boca de un umbral derrumbado con la compostura de alguien que ya ha superado el pánico que arruinaría a las criaturas menores.',
      '"Estas habitaciones superiores alguna vez respondían a topógrafos, portadores de lámparas y clerigos con manos estables. Ahora responden principalmente al hambre y a los accidentes."',
      '"Ve y nombra seis cámaras con tu paso. Si la oscuridad significa seguir tragando memoria, lo menos que podemos hacer es hacerla ahogarse con el registro."',
    ],
    acceptLabel: 'Aceptar tarea',
    rejectLabel: 'Descartar',
    questId: 'explore-6-rooms',
  },
  'ryan-wanderer': {
    pages: [
      'Ryan tiene la apariencia de un peregrino que hizo la paz con el fracaso temprano y ha honrado esa paz fielmente desde entonces.',
      '"Una vez creí que estos túneles eran un campo de prueba. Luego vi a tres serpientes más valientes reducirse a historia y escamas sueltas antes de terminar ese pensamiento."',
      '"Si comienza el fuego, no defiendas tu orgullo. El orgullo es abundante aquí. La sangre no. Sal primero. Reflexiona después, si el mundo es inusualmente misericordioso."',
    ],
    acceptLabel: 'Escuchar',
    rejectLabel: 'Seguir adelante',
    rewardScore: 4,
  },
  'aurex-wanderer': {
    pages: [
      'Aurex seStanding donde un filo de luz pálida ha logrado, contra todo sentido, sobrevivir tan profundo bajo la tierra. Su inmovilidad parece ceremonial.',
      '"Los pasillos superiores recuerdan el orden como un cadáver recuerda el calor. No de manera útil. Solo suficiente para ser trágico."',
      '"Carga el ayuno antiguo por mí. Veinte segundos al lado de una boca vacía no es santidad, pero es suficiente para que el alma revele si todavía comanda al cuerpo en absoluto."',
    ],
    repeatPages: [
      'Aurex gira su cabeza por un grado tan sutil que siente menos como atención que como juicio finalmente decidiendo reconocer una molestia.',
      '"Pedí disciplina, no otro discurso pequeño del apetito con tu cara. Termina el rito, o ahórrame la repetición de tus razones."',
    ],
    acceptLabel: 'Aceptar tarea',
    rejectLabel: 'Despreciar',
    questId: 'survive-20s-no-eat',
  },
  'belisar-wanderer': {
    pages: [
      'Belisar se levanta de las tinieblas occidentales tan suavemente que por un momento parece que la habitación misma ha elegido ponerse de pie y dirigirse a ti.',
      '"Ninguna oración. Ningún trato. He escuchado ambos de los labios de las cosas moribundas, y ninguno mejoró el final."',
      '"Luchemos. Si tu nervio es verdadero, que suene. Si es falso, que la piedra lo escuche también. Estos pasillos merecen música honesta por una vez."',
    ],
    repeatPages: [
      'Belisar te mira con el desdén reservado de un verdugo forzado a reprogramar por motivos meteorológicos.',
      '"Bien. Desprecio medidas incompletas. Un duelo rechazado pudre en la memoria como un cuerpo dejado en tierra poco profunda."',
    ],
    acceptLabel: 'Luchar',
    rejectLabel: 'Rechazar',
    rewardScore: 10,
  },
  'cyrene-wanderer': {
    pages: [
      'Cyrene dibuja un círculo en el polvo y el polvo duda, como si incertamente perteneciera más a la gravedad o a cualquier viejo voto que le da vida a su mano.',
      '"Cada cámara en este lugar enseña la misma lección en un dialecto diferente: permanece en movimiento, permanece dudoso, y nunca confundas la supervivencia con el perdón."',
      '"Tu regalo es la velocidad. Cuidado con ello. La velocidad se vuelve estupidez en el momento en que empieza a creerse elegido."',
    ],
    repeatPages: [
      'Cyrene te reconoce con una mirada demasiado medida para contar como calidez y demasiado suave para ser llamada indiferencia.',
      '"Todavía vivo. Eso significa que o estás aprendiendo, o la tumba ha puesto mal tu nombre para otro día. Te recomiendo que no te hagas arrogante sobre ninguna de las posibilidades."',
    ],
    acceptLabel: 'Escuchar',
    rejectLabel: 'Salir',
    rewardScore: 5,
  },
} as const;
