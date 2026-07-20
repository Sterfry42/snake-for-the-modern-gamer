import type { NpcTranslations } from '../../types.js';
export const NPC_ENCOUNTERS_FR: NpcTranslations = {
  'shrine-maiden-miko': {
    pages: [
      'Une jeune femme en robes blanches et cramoisies se tient devant un torii à moitié dévoré par le bambou, avec une expression aussi sereine que le brouillard de montagne qui tourbillonne à ses chevilles.',
      '"Les kami veillent sur ceux qui s\'approchent avec respect. Souhaitez-vous laisser une offrande au sanctuaire ?"',
      '"Même le plus petit cadeau porte le poids de l\'intention. Apportez des pommes -- le sanctuaire a eu faim."',
    ],
    repeatPages: [
      "Miko s'incline avec grâce. Les lanternes de papier clignotent dans un vent qui ne la touche pas.",
    ],
    acceptLabel: 'Laisser offrande',
    rejectLabel: "S'incliner et partir",
    rewardScore: 15,
  },
  'yokai-chef': {
    pages: [
      "Derrière un humble stand en bois, un chef aux cheveux sombres comme l'encre remue une marmite fumante avec une concentration féroce. Une odeur ténue de fumée persiste -- ou peut-être est-ce l'imagination.",
      '"Bienvenue, bienvenue ! Le meilleur bouillon de toutes les provinces. Ou de la dimension. Peu importe."',
      '"Goûtez au spécial. Il ne vous mange pas en retour. D\'habitude."',
    ],
    repeatPages: [
      'Le chef fait glisser un bol fumant sur le comptoir sans lever les yeux, comme si le bouillon avait des opinions sur le service.',
      '"Plus de bouillon ? Ou vous accumulez toujours la valeur de demander combien ça coûte en âmes ?"',
    ],
    acceptLabel: 'Commander ramen',
    rejectLabel: 'Juste en regardant',
    rewardScore: 12,
  },
  'kappa-duel': {
    pages: [
      "Une petite créature reptilienne avec un bol d'eau parfaitement équilibré sur sa tête se tient devant un étang de poissons koi, les bras croisés et les sourcils bien froncés.",
      "\"Hmph. Tu veux passer ? Très bien. Duelles-moi -- ou apporte-moi quelque chose que je veux vraiment. Concombre. Ce n'est pas que ça m'importe. C'est juste... rafraîchissant.\"",
    ],
    repeatPages: [
      "Le kappa incline son bol d'eau d'un doigt griffu, observant l'ondulation avec un désapprobation à peine dissimulée.",
      '"Tu t\'es enfui, hein ? Digne des gens de la surface. Sans engagement envers rien."',
    ],
    acceptLabel: 'Dueller',
    rejectLabel: 'Apporter concombre',
    questId: 'kappas-challenge',
  },
  'tanuki-shenanigans': {
    pages: [
      "Un rat-laveur gros et rond avec un petit chapeau de paille apparaît derrière une tige de bambou, souriant avec le genre de confiance qu'une créature connue pour ses illusions possède.",
      '"Oho ! La fortune favorise les curieux. Aidez-moi avec une petite tâche et les cieux vous récompenseront ! Ou je le ferai. Qui que vienne en premier."',
      '"Le bois de bambou cache quelque chose de précieux. Trouvez-le. Je prendrai le crédit de toute façon."',
    ],
    repeatPages: [
      'Le tanuki incline son petit chapeau et cligne des yeux si fort que les deux yeux semblent sortir temporairement de leurs orbites.',
      '"Tu l\'as trouvé ? Pas ? Eh bien, continue de chercher. Ta confusion est un excellent comique."',
    ],
    acceptLabel: 'Accepter farce',
    rejectLabel: 'En douter',
    questId: 'tanukis-shenanigans',
  },
  'ronin-wanderer': {
    pages: [
      "Un samouraï vagabond se tient immobile dans un col de montagne, l'épée au fourreau mais sa présence aiguë comme une lame dégainée.",
      '"Je ne cherche pas la gloire. Je cherche la clarté. Démontrer votre valeur, et je partagerai ce que j\'ai appris."',
      '"Dégainez l\'acier. Que la montagne décide qui parle en premier -- le vainqueur ou le vent."',
    ],
    repeatPages: [
      "La main du ronin repose sur le fourreau. Le bambou s'incline autour de lui comme pour s'excuser avec la montagne.",
      "\"Encore vivant. Continuer d'essayer. Comme c'est ennuyeux. Comme c'est admirable.\"",
    ],
    acceptLabel: 'Dégaîner',
    rejectLabel: 'Passer en silence',
    rewardScore: 20,
  },
  'tengu-encounter': {
    pages: [
      "Un esprit gigantesque semblable à un oiseau se pose sur le bord d'une falaise, ailes pliées, yeux perçants. L'air devient calme autour de lui.",
      '"Les mortels qui apportent des offrandes à la montagne reçoivent des faveurs. Apportez-moi une branche de cerisier, et je vous laisserai voler."',
    ],
    repeatPages: [
      'Le tengu incline la tête et vous étudie comme une tempête étudie un champ -- avec une malice patiente.',
      '"La montagne se souvient. Moi aussi. Tu ne seras pas le dernier à se tenir ici et à douter."',
    ],
    acceptLabel: 'Offrir branche',
    rejectLabel: 'Partir respectueusement',
    rewardScore: 25,
  },
  'freak-joey': {
    pages: [
      "Il surgit des profondeurs sombres avec un sourire trop impatient d'appartenir à quelque chose de vivant. Les chambres autour de lui se taisent de la manière dont les anciennes chapelles se taisent quand quelqu'un entre en portant le meurtre comme un sacrement.",
      "\"On m'appelle Freak Joey. Pas parce que je suis né mal. Parce que j'ai continué à choisir de devenir toujours plus cruel chaque fois que les tunnels m'ont interrogé.\"",
      '"Accepte le duel. Que la pierre entende si ton courage est un principe vivant ou simplement un bruit que fait ton corps avant d\'être ouvert."',
    ],
    acceptLabel: 'Dueller',
    rejectLabel: 'Refuser',
  },
  'lindsey-wanderer': {
    pages: [
      "Lindsey attend à l'embouchure d'un seuil effondré avec la composture de quelqu'un qui a déjà surmonté la panique qui ruineraient les créatures mineures.",
      '"Ces chambres supérieures répondaient autrefois aux topographes, porteurs de lampes et clercs aux mains stables. Maintenant elles répondent principalement à la faim et aux accidents."',
      '"Allez nommez six chambres de votre pas. Si l\'obscurité signifie continuer à avaler la mémoire, le moins que nous puissions faire est de l\'étouffer avec le registre."',
    ],
    acceptLabel: 'Accepter quête',
    rejectLabel: 'Licencier',
    questId: 'explore-6-rooms',
  },
  'ryan-wanderer': {
    pages: [
      "Ryan a l'apparence d'un pèlerin qui a fait la paix avec l'échec tôt et a honoré cette paix fidèlement depuis.",
      "\"Un jour je croyais que ces tunnels étaient un champ d'essai. Puis j'ai vu trois serpents plus courageux réduits à histoire et écailles lâches avant d'avoir fini cette pensée.\"",
      "\"Si le feu commence, ne défendez pas votre orgueil. L'orgueil est abondant ici. Le sang ne l'est pas. Sortez d'abord. Réfléchissez après, si le monde est inhabituellement miséricordieux.\"",
    ],
    acceptLabel: 'Écouter',
    rejectLabel: 'Passer',
    rewardScore: 4,
  },
  'aurex-wanderer': {
    pages: [
      'Aurex se tient là où un fil de lumière pâle a réussi, contre tout sens, survivre si profond sous terre. Son immobilité semble cérémonielle.',
      '"Les couloirs supérieurs se souviennent de l\'ordre comme un cadavre se souvient de la chaleur. Pas de manière utile. Juste assez pour être tragique."',
      "\"Portez le jeûne ancien pour moi. Vingt secondes à côté d'une bouche vide ne sont pas sainteté, mais c'est suffisant pour que l'âme révèle si elle commande encore le corps du tout.\"",
    ],
    repeatPages: [
      "Aurex tourne la tête d'un degré si subtil que cela sent moins comme une attention que comme un jugement enfin décidé à reconnaître une nuisance.",
      '"J\'ai demandé de la discipline, pas un autre petit discours sur l\'appétit avec ton visage. Finis le rituel, ou épargne-moi la répétition de tes raisons."',
    ],
    acceptLabel: 'Accepter quête',
    rejectLabel: 'Ricaner',
    questId: 'survive-20s-no-eat',
  },
  'belisar-wanderer': {
    pages: [
      "Belisar se lève des ténèbres occidentales si doucement qu'un moment on croit que la chambre elle-même a choisi de se mettre debout et de vous parler.",
      '"Aucune prière. Aucun marché. J\'ai entendu les deux des lèvres des choses mourantes, et aucun n\'a amélioré la fin."',
      "\"Combattons. Si ton nerf est vrai, qu'il résonne. S'il est faux, que la pierre l'entende aussi. Ces couloirs méritent de l'honnêteté une fois.\"",
    ],
    repeatPages: [
      "Belisar vous regarde avec le dédain réservé d'un bourreau forcé de reprogrammer pour des raisons météorologiques.",
      '"Bien. Le mépris mesure les incomplets. Un duel refusé pourrit en mémoire comme un corps laissé en terre peu profonde."',
    ],
    acceptLabel: 'Combattre',
    rejectLabel: 'Décliner',
    rewardScore: 10,
  },
  'cyrene-wanderer': {
    pages: [
      "Cyrene dessine un cercle dans la poussière et la poussière hésite, comme si elle appartenait incertainement plus à la gravité ou à n'importe quel vieux vœu qui donne vie à sa main.",
      '"Chaque chambre dans cet endroit enseigne la même leçon dans un dialecte différent : reste en mouvement, reste dubitatif, et ne confonds jamais la survie avec le pardon."',
      '"Ton cadeau est la vitesse. Attention avec elle. La vitesse devient stupidité au moment où elle commence à se croire élue."',
    ],
    repeatPages: [
      "Cyrene vous reconnaît d'un regard trop mesuré pour compter comme de la chaleur et trop doux pour être appelé indifférence.",
      '"Encore vivant. Cela signifie soit tu apprends, soit la tombe a mal écrit ton nom pour un autre jour. Je te recommande de ne pas devenir arrogant sur aucune des possibilités."',
    ],
    acceptLabel: 'Écouter',
    rejectLabel: 'Partir',
    rewardScore: 5,
  },
  'sterling-fisher': {
    pages: [
      "Une silhouette usée est accroupie près d'une canne pliable, observant l'eau avec la quietude patiente de quelqu'un à qui on a dit que l'océan écoute.",
      '"L\'eau profonde ne pardonne pas la vitesse. Mangez vite d\'abord. Tu veux du poisson ? Apprends à attendre."',
      '"J\'ai une tâche pour toi. Cinq poissons dans l\'océan submergé. Pas pour moi -- pour ceux à la maison qui ne goûtent pas de viande propre depuis trop longtemps."',
    ],
    repeatPages: [
      "Sterling ajuste sa ligne sans lever les yeux. L'eau bouge avec quelque chose qui ressemble presque à de la patience.",
      '"Tu continues à chasser ? Bien. L\'eau se souvient de qui revient. Respecte ça plus que la plupart des choses d\'en bas."',
    ],
    acceptLabel: 'Accepter la chasse',
    rejectLabel: "Ce n'est pas mon type d'eau",
    questId: 'fisherman',
  },
} as const;
