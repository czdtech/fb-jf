---
locale: fr
urlstr: futoshiki
title: "Futoshiki"
description: "Futoshiki affûte ta logique : place des chiffres uniques par ligne et colonne tout en respectant les signes d’inégalité pour des déductions élégantes."
iframeSrc: 'https://6g7i64vihegl0.h5games.usercontent.goog/v/7bd886r75d4ag/'
thumbnail: /new-images/thumbnails/futoshiki.jpg
tags:
  - puzzle
  - thinky
score: 4.3/5  (2098 votes)
releaseDate: 2025-10-18T00:00:00.000Z
---


### Présentation du jeu

Futoshiki (« pas égal ») est un puzzle logique de type carré latin, proche du Sudoku, mais avec des signes d’inégalité (>, <) entre certaines cases voisines. Tu dois placer les chiffres de sorte que chaque ligne et chaque colonne contienne tous les nombres exactement une fois, tout en respectant toutes les inégalités indiquées. Ces signes créent des chaînes très fortes qui permettent des déductions propres et puissantes.

### Guide de jeu et stratégies

1.  Chaînes d’inégalités : si A > B > C, alors A ≥ C + 2. Utilise cette information pour limiter les candidats dans chaque case de la chaîne.
2.  Extrêmes : une chaîne A > … > B borne A vers le haut et B vers le bas. Sur les extrémités de chaîne, élimine les valeurs impossibles (1 pour le plus grand, valeur max pour le plus petit, etc.).
3.  Balayage lignes/colonnes : applique les contraintes de carré latin (chaque chiffre une fois par ligne/colonne) pour éliminer agressivement les candidats qui se répètent.
4.  Boucles de contradiction : sur les cases critiques, essaie une valeur et vois si cela casse une inégalité ou crée un doublon sur une ligne/colonne ; si oui, remonte et élimine cette possibilité.
5.  Symétrie : beaucoup de grilles bien construites ont des motifs d’inégalités symétriques. Repère ces structures pour appliquer les mêmes idées de chaque côté.

### Commandes

- Tape sur une case pour saisir un chiffre ou des candidats, bascule en mode brouillon/pencil, utilise annuler/rétablir pour corriger.

### Foire aux questions (FAQ)

- Q : Je suis bloqué, une idée pour repartir ?
  
  R : Développe les chaînes d’inégalités en bornes explicites. Par exemple, si 5 > □ > 3, alors la case centrale ne peut être que 4. Combine ces bornes avec les contraintes de lignes/colonnes.

- Q : Est‑ce que je dois forcément deviner ?
  
  R : Les bonnes grilles sont solvables uniquement par logique. Au pire, utilise des hypothèses contrôlées sur une case et reviens en arrière rapidement si tu obtiens une contradiction.

- Q : Qu’est‑ce qui différencie Futoshiki d’un Sudoku ?
  
  R : Les inégalités ajoutent des contraintes dirigées supplémentaires, qui permettent des coups forcés très forts et des chaînes déductives qu’on ne trouve pas dans les Sudoku classiques.

