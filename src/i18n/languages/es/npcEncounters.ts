import type { NpcTranslations } from '../../types.js';
export const NPC_ENCOUNTERS_ES: NpcTranslations = {
  'shrine-maiden-miko': {
    pages: [
      'Una joven mujer con túnicas blancas y carmesí se encuentra frente a un torii medio devorado por el bambú, con una expresión tan serena como la niebla de la montaña que se arremolina en sus tobillos.',
      '"Los kami velan por aquellos que se acercan con respeto. ¿Querrás dejar una ofrenda en el santuario?"',
      '"Incluso el regalo más pequeño lleva el peso de la intención. Trae manzanas -- el santuario ha tenido hambre."',
    ],
    repeatPages: [
      'Miko se inclina con gracia. Los faroles de papel parpadean en un viento que no la toca.',
    ],
    acceptLabel: 'Dejar ofrenda',
    rejectLabel: 'Inclinar y partir',
    rewardScore: 15,
  },
  'yokai-chef': {
    pages: [
      'Detrás de un humilde puesto de madera, un chef de cabello oscuro como la tinta revuelve una olla humeante con feroz concentración. Un tenue aroma a humo permanece -- o tal vez sea imaginación.',
      '"¡Bienvenido, bienvenido! El mejor caldo de todas las provincias. O la dimensión. Sea como sea."',
      '"Prueba lo especial. No te come de vuelta. Por lo general."',
    ],
    repeatPages: [
      'El chef desliza un bol humeante sobre el mostrador sin mirar hacia arriba, como si el caldo tuviera opiniones sobre ser servido.',
      '"¿Más caldo? ¿O todavía estás acumulando el valor de preguntar cuánto cuesta en almas?"',
    ],
    acceptLabel: 'Pedir ramen',
    rejectLabel: 'Solo mirando',
    rewardScore: 12,
  },
  'kappa-duel': {
    pages: [
      'Una pequeña criatura reptiliana con un plato de agua perfectamente equilibrado en su cabeza se encuentra frente a un estanque de koi, con los brazos cruzados y el ceño fruncido firmemente puesto.',
      '"Hmph. ¿Quieres pasar? Bien. Duelo conmigo -- o tráeme algo que realmente quiero. Pepino. No es que me importe. Es solo... refrescante."',
    ],
    repeatPages: [
      'El kappa inclina su plato de agua con un dedo con garra, observando la ondulación con desaprobación apenas disimulada.',
      '"Te fuiste, ¿verdad? Propio de los de la superficie. Sin compromiso con nada."',
    ],
    acceptLabel: 'Duelo',
    rejectLabel: 'Traer pepino',
    questId: 'kappas-challenge',
  },
  'tanuki-shenanigans': {
    pages: [
      'Un gato mapache gordo con un pequeño sombrero de paja se materializa detrás de un tallo de bambú, sonriendo con el tipo de confianza que solo una criatura conocida por sus ilusiones posee.',
      '"¡Oho! La fortuna favorece a los curiosos. Ayúdame con una pequeña tarea y los cielos te recompensarán! O haré yo. Cualquiera que venga primero."',
      '"El bosque de bambú esconde algo preciado. Encuéntralo. Yo tomaré el crédito de todas formas."',
    ],
    repeatPages: [
      'El tanuki inclina su pequeño sombrero y parpadea tan fuerte que ambos ojos parecen salir temporalmente de sus órbitas.',
      '"¿Ya lo encontraste? ¿No? Bueno, sigue buscando. Tu confusión es comedia excelente."',
    ],
    acceptLabel: 'Aceptar travesura',
    rejectLabel: 'Dudarlo',
    questId: 'tanukis-shenanigans',
  },
  'ronin-wanderer': {
    pages: [
      'Un samurái vagabundo se encuentra inmóvil en un paso de montaña, con la espada envainada pero su presencia aguda como una hoja desenvainada.',
      '"No busco gloria. Busco claridad. Demuestra tu valor, y compartiré lo que he aprendido."',
      '"Desenfunda el acero. Que la montaña decida quién habla primero -- el vencedor o el viento."',
    ],
    repeatPages: [
      'La mano del ronin descansa en la vaina. El bambú se inclina a su alrededor como si se disculpara con la montaña.',
      '"Aún respirando. Siguiendo intentando. Qué tedioso. Qué admirable."',
    ],
    acceptLabel: 'Desenvainar',
    rejectLabel: 'Pasar en silencio',
    rewardScore: 20,
  },
  'tengu-encounter': {
    pages: [
      'Un espíritu bird-like gigante se posa en el borde de un acantilado, alas dobladas, ojos penetrantes. El aire se vuelve tranquilo a su alrededor.',
      '"Los mortales que traen ofrendas a la montaña reciben favores. Tráeme una rama de cerezo, y te dejaré volar."',
    ],
    repeatPages: [
      'El tengu inclina la cabeza y te estudia como una tormenta estudia un campo -- con malicia paciente.',
      '"La montaña recuerda. Yo también. No serás el último en pararse aquí y dudar."',
    ],
    acceptLabel: 'Ofrecer rama',
    rejectLabel: 'Partir respetuosamente',
    rewardScore: 25,
  },
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
  'sterling-fisher': {
    pages: [
      'Una figura desgastada se sienta en cuclillas junto a una caña plegable, observando el agua con la quietud paciente de alguien a quien le han dicho que el océano escucha.',
      '"El agua profunda no perdona la velocidad. Come lo rápido primero. ¿Quieres peces? Aprende a esperar."',
      '"Tengo una tarea para ti. Cinco peces en el océano sumergido. No para mí — para los de casa que no prueban carne limpia desde hace demasiado."',
    ],
    repeatPages: [
      'Sterling ajusta su línea sin mirar hacia arriba. El agua se agita con algo que casi parece paciencia.',
      '"¿Sigue cazando? Bien. El agua recuerda quién vuelve. Respeta eso más que la mayoría de las cosas de ahí abajo."',
    ],
    acceptLabel: 'Aceptar la caza',
    rejectLabel: 'No es mi tipo de agua',
    questId: 'fisherman',
  },
} as const;
