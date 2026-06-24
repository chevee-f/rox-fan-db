const masterQuizData = [
  {
    "id": 2,
    "question": "In RO lore, the giant that created the world is Pangu.",
    "answer": "False (X)"
  },
  {
    "id": 3,
    "question": "In RO lore, the giant that created the world is Ymir.",
    "answer": "True (O)"
  },
  {
    "id": 4,
    "question": "RO’s story is set in Midgard.",
    "answer": "True (O)"
  },
  {
    "id": 5,
    "question": "RO’s story is set in a parallel world.",
    "answer": "False (X)"
  },
  {
    "id": 6,
    "question": "RO’s full name is Ragnarok Online.",
    "answer": "True (O)"
  },
  {
    "id": 7,
    "question": "RO’s full name is Regolark Online.",
    "answer": "False (X)"
  },
  {
    "id": 8,
    "question": "Kafra Service Employees can only be found in Prontera.",
    "answer": "False (X)"
  },
  {
    "id": 9,
    "question": "Ygnizem class changed into Swordsman.",
    "answer": "True (O)"
  },
  {
    "id": 10,
    "question": "Ygnizem class changed into Mage.",
    "answer": "False (X)"
  },
  {
    "id": 11,
    "question": "The captain in charge of Sea Teleport on Izlude Island is Carew.",
    "answer": "True (O)"
  },
  {
    "id": 12,
    "question": "The captain in charge of Sea Teleport on Izlude Island is Kahn.",
    "answer": "False (X)"
  },
  {
    "id": 13,
    "question": "Increasing Strength (STR) increases Physical Attack (ATK).",
    "answer": "True (O)"
  },
  {
    "id": 14,
    "question": "Increasing Strength (STR) increases Physical Attack (ATK) and Magic Attack (M.ATK).",
    "answer": "False (X)"
  },
  {
    "id": 15,
    "question": "Increasing Strength (STR) increases Physical Attack (ATK) and Physical Defense (DEF).",
    "answer": "False (X)"
  },
  {
    "id": 16,
    "question": "Increasing Agility (AGI) increases Attack Speed (ASPD) and Dodge.",
    "answer": "True (O)"
  },
  {
    "id": 17,
    "question": "Increasing Agility (AGI) increases haste.",
    "answer": "False (X)"
  },
  {
    "id": 18,
    "question": "Increasing Agility (AGI) increases Movement Speed (Movement Speed).",
    "answer": "False (X)"
  },
  {
    "id": 19,
    "question": "Increasing Vitality (VIT) increases Physical Defense (DEF) and Magic Defense (MDEF).",
    "answer": "False (X)"
  },
  {
    "id": 20,
    "question": "Increasing Vitality (VIT) increases Max HP and Max SP.",
    "answer": "False (X)"
  },
  {
    "id": 21,
    "question": "Increasing Vitality (VIT) increases Physical Defense (DEF).",
    "answer": "True (O)"
  },
  {
    "id": 22,
    "question": "Increasing Intelligence (INT) increases Magic Attack (M.ATK) and Magic Defense (M.DEF).",
    "answer": "True (O)"
  },
  {
    "id": 23,
    "question": "Increasing Intelligence (INT) increases Max SP.",
    "answer": "True (O)"
  },
  {
    "id": 24,
    "question": "Increasing Intelligence (INT) increases Max HP and Max SP.",
    "answer": "False (X)"
  },
  {
    "id": 25,
    "question": "Increasing Dexterity (DEX) increases haste.",
    "answer": "True (O)"
  },
  {
    "id": 26,
    "question": "Increasing Dexterity (DEX) increases Hit.",
    "answer": "True (O)"
  },
  {
    "id": 27,
    "question": "Increasing Dexterity (DEX) increases Movement Speed (Movement Speed).",
    "answer": "False (X)"
  },
  {
    "id": 28,
    "question": "Increasing Luck (LUK) increases Crit and Anti-Crit.",
    "answer": "True (O)"
  },
  {
    "id": 29,
    "question": "Increasing Luck (LUK) increases Physical Attack (ATK).",
    "answer": "True (O)"
  },
  {
    "id": 30,
    "question": "Increasing Luck (LUK) increases Hit.",
    "answer": "False (X)"
  },
  {
    "id": 31,
    "question": "Daggers deal 100% damage to Large and Medium monsters.",
    "answer": "False (X)"
  },
  {
    "id": 32,
    "question": "Daggers deal 100% damage to Small monsters.",
    "answer": "True (O)"
  },
  {
    "id": 33,
    "question": "One-Handed Swords deal 100% damage to Large and Medium monsters.",
    "answer": "False (X)"
  },
  {
    "id": 34,
    "question": "One-Handed Swords deal 100% damage to Medium monsters.",
    "answer": "True (O)"
  },
  {
    "id": 35,
    "question": "Two-Handed Swords deal 100% damage to Large monsters.",
    "answer": "True (O)"
  },
  {
    "id": 36,
    "question": "Two-Handed Swords deal 100% damage to Medium monsters.",
    "answer": "False (X)"
  },
  {
    "id": 37,
    "question": "Bows deal 100% damage to Medium and Small monsters.",
    "answer": "True (O)"
  },
  {
    "id": 38,
    "question": "Bows deal 100% damage to Large monsters.",
    "answer": "False (X)"
  },
  {
    "id": 39,
    "question": "Knight’s Weapon – Spear deals 100% DMG to Large monsters.",
    "answer": "True (O)"
  },
  {
    "id": 40,
    "question": "Knight’s Weapon – Spear deals 100% DMG to Small monsters.",
    "answer": "False (X)"
  },
  {
    "id": 41,
    "question": "Any class can rent a Pecopeco mount as long as they meet the conditions.",
    "answer": "False (X)"
  },
  {
    "id": 42,
    "question": "Swordsmen can rent a Pecopeco mount as long as they meet the conditions.",
    "answer": "False (X)"
  },
  {
    "id": 43,
    "question": "Knights can rent a Pecopeco mount as long as they meet the conditions.",
    "answer": "True (O)"
  },
  {
    "id": 44,
    "question": "Any class can rent a Falcon as long as they meet the conditions.",
    "answer": "False (X)"
  },
  {
    "id": 45,
    "question": "Archers can rent a Falcon as long as they meet the conditions.",
    "answer": "False (X)"
  },
  {
    "id": 46,
    "question": "Hunters can rent a Falcon as long as they meet the conditions.",
    "answer": "True (O)"
  },
  {
    "id": 47,
    "question": "Izlude is located in the southeast of Prontera.",
    "answer": "True (O)"
  },
  {
    "id": 48,
    "question": "Izlude is located in the northwest of Prontera.",
    "answer": "False (X)"
  },
  {
    "id": 49,
    "question": "Geffen is located in the southeast of Prontera.",
    "answer": "False (X)"
  },
  {
    "id": 50,
    "question": "Geffen is located in the northwest of Prontera.",
    "answer": "True (O)"
  },
  {
    "id": 51,
    "question": "Payon is located in the southeast of Prontera.",
    "answer": "True (O)"
  },
  {
    "id": 52,
    "question": "Payon is located in the southwest of Prontera.",
    "answer": "False (X)"
  },
  {
    "id": 53,
    "question": "Morroc is located in the southeast of Prontera.",
    "answer": "False (X)"
  },
  {
    "id": 54,
    "question": "Morroc is located in the southwest of Prontera.",
    "answer": "True (O)"
  },
  {
    "id": 55,
    "question": "You cannot sneeze with your eyes open.",
    "answer": "True (O)"
  },
  {
    "id": 56,
    "question": "Humans share 50% of our DNA with bananas.",
    "answer": "True (O)"
  },
  {
    "id": 57,
    "question": "Crocodiles can walk backwards.",
    "answer": "True (O)"
  },
  {
    "id": 58,
    "question": "The brain is the fattiest organ. It is comprised of approximately 60% fat.",
    "answer": "True (O)"
  },
  {
    "id": 59,
    "question": "Eating a big meal affects your hearing.",
    "answer": "True (O)"
  },
  {
    "id": 60,
    "question": "Swordsman’s skill [Increase HP Recovery] increases their HP Regen.",
    "answer": "True (O)"
  },
  {
    "id": 61,
    "question": "Swordsman’s skill [Increase HP Recovery] increases their HP Regen and SP Regen.",
    "answer": "False (X)"
  },
  {
    "id": 62,
    "question": "Archer’s skill [Double Strafe] is an active skill.",
    "answer": "True (O)"
  },
  {
    "id": 63,
    "question": "Archer’s skill [Double Strafe] is a passive skill.",
    "answer": "False (X)"
  },
  {
    "id": 64,
    "question": "Acolyte’s skill [Blessing] increases STR, DEX, and INT.",
    "answer": "True (O)"
  },
  {
    "id": 65,
    "question": "Acolyte’s skill [Blessing] increases Crit and Anti-Crit.",
    "answer": "False (X)"
  },
  {
    "id": 66,
    "question": "Mage’s skill [Increase SP Recovery] increases their SP Regen.",
    "answer": "True (O)"
  },
  {
    "id": 67,
    "question": "Mage’s skill [Increase SP Recovery] increases their HP Regen and SP Regen.",
    "answer": "False (X)"
  },
  {
    "id": 68,
    "question": "Thief’s skill [Double Attack] can be used when equipped with Daggers.",
    "answer": "True (O)"
  },
  {
    "id": 69,
    "question": "Thief’s skill [Double Attack] can be used when equipped with Katars.",
    "answer": "False (X)"
  },
  {
    "id": 70,
    "question": "Novice’s skill [First Aid] recovers their HP.",
    "answer": "True (O)"
  },
  {
    "id": 71,
    "question": "Novice’s skill [First Aid] recovers their HP and SP.",
    "answer": "False (X)"
  },
  {
    "id": 72,
    "question": "Novice’s skill [Play Dead] clears threat.",
    "answer": "True (O)"
  },
  {
    "id": 73,
    "question": "Novice’s skill [Play Dead] increases HP Regen and SP Regen.",
    "answer": "False (X)"
  },
  {
    "id": 74,
    "question": "Legends say that there is an unethical coal tycoon at Mjolnir Mine named Feng Yin.",
    "answer": "True (O)"
  },
  {
    "id": 75,
    "question": "There was a kingdom of magic beneath the surface of Geffen.",
    "answer": "True (O)"
  },
  {
    "id": 76,
    "question": "You need to be in a party to enter Endless Tower.",
    "answer": "True (O)"
  },
  {
    "id": 77,
    "question": "Geffen is where the Mage Guild is based.",
    "answer": "True (O)"
  },
  {
    "id": 78,
    "question": "As the guild level increases, the maximum number of members increases too.",
    "answer": "True (O)"
  },
  {
    "id": 79,
    "question": "A legendary king of the past lived in seclusion in the mountainous city of Payon.",
    "answer": "True (O)"
  },
  {
    "id": 80,
    "question": "A Magnolia is the vengeful spirit of a cracked Pecopeco Egg.",
    "answer": "True (O)"
  },
  {
    "id": 81,
    "question": "The Falcon is exclusive to hunters; other classes cannot own it.",
    "answer": "True (O)"
  },
  {
    "id": 82,
    "question": "The desert city of Morroc is a heaven for knights.",
    "answer": "False (X)"
  },
  {
    "id": 83,
    "question": "Panacea can cure most negative effects. True (O) or False (X)?",
    "answer": "True (O)"
  },
  {
    "id": 84,
    "question": "In the arm wrestling minigame in the tavern, everyone uses their left hand.",
    "answer": "False (X)"
  },
  {
    "id": 85,
    "question": "Moonlight Flower has beautiful yellow pupils.",
    "answer": "False (X)"
  },
  {
    "id": 86,
    "question": "A soccer team can have 11 players on the field.",
    "answer": "True (O)"
  },
  {
    "id": 87,
    "question": "A thick glass is more likely to crack than a thin one when hot water is poured into it during the winter.",
    "answer": "True (O)"
  },
  {
    "id": 88,
    "question": "Toothpaste’s mint flavor comes from mint leaves.",
    "answer": "True (O)"
  },
  {
    "id": 89,
    "question": "The Kafra Maids know this trick of removing the burnt smell of rice by adding a few drops of vinegar into it.",
    "answer": "True (O)"
  },
  {
    "id": 90,
    "question": "The Monster Investigator is losing their sense of smell because their liver is failing.",
    "answer": "False (X)"
  },
  {
    "id": 91,
    "question": "Talyn feels warmed up because he ate too many lychees.",
    "answer": "True (O)"
  },
  {
    "id": 92,
    "question": "The Kitty Girl in Foulon Tavern has a sensitive tongue, so she never eats hot food.",
    "answer": "True (O)"
  },
  {
    "id": 93,
    "question": "Dry ice is the solid form of water.",
    "answer": "False (X)"
  },
  {
    "id": 94,
    "question": "The most abundant organism in the ocean is Mutant Piranhas.",
    "answer": "False (X)"
  },
  {
    "id": 95,
    "question": "The honeycomb cells that Mistress makes are circular.",
    "answer": "False (X)"
  },
  {
    "id": 96,
    "question": "Pencil lead is made using graphite.",
    "answer": "True (O)"
  },
  {
    "id": 97,
    "question": "Indonesia’s country calling code is +62.",
    "answer": "True (O)"
  },
  {
    "id": 98,
    "question": "The main function of the windmill at Prontera West Gate is to drain water.",
    "answer": "True (O)"
  },
  {
    "id": 99,
    "question": "The roman numeral XVIII equals 18.",
    "answer": "True (O)"
  },
  {
    "id": 100,
    "question": "The world capital with the longest name is Bangkok.",
    "answer": "True (O)"
  },
  {
    "id": 101,
    "question": "You can sit on the long benches at Prontera South Gate for as long as you want.",
    "answer": "False (X)"
  },
  {
    "id": 102,
    "question": "Poisons are essential consumables for archers.",
    "answer": "False (X)"
  },
  {
    "id": 103,
    "question": "Having a good relationship with Hollgrehenn increases the success rate when upgrading equipments.",
    "answer": "True (O)"
  },
  {
    "id": 104,
    "question": "A lens that is thicker at the edges than it is in the middle is called a convex lens.",
    "answer": "False (X)"
  },
  {
    "id": 105,
    "question": "The measure of speed for a boat is a Knot.",
    "answer": "True (O)"
  },
  {
    "id": 106,
    "question": "The lightest element ishydrogen.",
    "answer": "True (O)"
  },
  {
    "id": 107,
    "question": "The roman numeral M equals1,000,000.",
    "answer": "False (X)"
  },
  {
    "id": 108,
    "question": "The Philippines’ country calling code is +63.",
    "answer": "True (O)"
  },
  {
    "id": 109,
    "question": "The interior angles of a triangle always equal 180 degrees.",
    "answer": "True (O)"
  },
  {
    "id": 110,
    "question": "Drake’s crow always stands on his right shoulder.",
    "answer": "False (X)"
  },
  {
    "id": 111,
    "question": "The interior angles of a square always equal 360 degrees. T、True (O) or False (X)?",
    "answer": "True (O)"
  },
  {
    "id": 112,
    "question": "There is a lovely New Student Academy Recruiter in Prontera, named Qiqi.",
    "answer": "False (X)"
  },
  {
    "id": 113,
    "question": "Lotus root is the root of a lotus.",
    "answer": "False (X)"
  },
  {
    "id": 114,
    "question": "The closest planet to the sun is Mars.",
    "answer": "False (X)"
  },
  {
    "id": 115,
    "question": "The color black absorbs all seven colors of the sunlight.",
    "answer": "True (O)"
  },
  {
    "id": 116,
    "question": "Clouds and mist are essentially the same substance.",
    "answer": "True (O)"
  },
  {
    "id": 117,
    "question": "Koko from Payon suffers from night blindness because she is a picky eater, resulting in vitamin B deficiency.",
    "answer": "False (X)"
  },
  {
    "id": 118,
    "question": "Koko from Payon grinds her teeth at night because she has zinc deficiency.",
    "answer": "True (O)"
  },
  {
    "id": 119,
    "question": "Ragnarok Online is a game adapted from a comic.",
    "answer": "True (O)"
  },
  {
    "id": 120,
    "question": "Damage dealt by magic attacks is affected by the target’s size.",
    "answer": "False (X)"
  },
  {
    "id": 121,
    "question": "The biggest land animal is an elephant.",
    "answer": "True (O)"
  },
  {
    "id": 122,
    "question": "Poison attacks increase damage toward all attributes.",
    "answer": "False (X)"
  },
  {
    "id": 123,
    "question": "Attack Speed (ASPD) and Final Attack Speed (Final ASPD) are different stats.",
    "answer": "True (O)"
  },
  {
    "id": 124,
    "question": "Crit and Final Crit are the same stat.",
    "answer": "False (X)"
  },
  {
    "id": 125,
    "question": "Dodge and Final Dodge are the same stat.",
    "answer": "False (X)"
  },
  {
    "id": 126,
    "question": "The amount of holes in a round of golf is 20.",
    "answer": "False (X)"
  },
  {
    "id": 127,
    "question": "After using Magnum Break, the attribute of normal attacks will be changed to Fire.",
    "answer": "True (O)"
  },
  {
    "id": 128,
    "question": "After using Aspersio, the attribute of the target’s normal attacks will be changed to Holy.",
    "answer": "True (O)"
  },
  {
    "id": 129,
    "question": "Every day at12:00 PM and 8:00 PM, you can refill Odin’s Blessing in Prontera more quickly than normal.",
    "answer": "True (O)"
  },
  {
    "id": 130,
    "question": "You can reduce the variable channeling time of skills by increasing your haste (VIG).",
    "answer": "True (O)"
  },
  {
    "id": 131,
    "question": "The respawn times for MVPs and Minis are the same.",
    "answer": "False (X)"
  },
  {
    "id": 132,
    "question": "When searching for items to buy at shops, you can only open each shop to search individually.",
    "answer": "False (X)"
  },
  {
    "id": 133,
    "question": "At the Exchange Center, after an item is sold for Diamonds, you can earn an equivalent amount of Crystals corresponding to the Diamonds deducted after tax.",
    "answer": "True (O)"
  },
  {
    "id": 134,
    "question": "Once Maya activates Defensive Stance, Ranged classes should boost their DPS to break the shield.",
    "answer": "False (X)"
  },
  {
    "id": 135,
    "question": "It’s said the Munak and Bongun were a loving couple before they became monsters.",
    "answer": "False (X)"
  },
  {
    "id": 136,
    "question": "The father and daughter outside the Prontera South Gate are not actually related by blood.",
    "answer": "True (O)"
  },
  {
    "id": 137,
    "question": "There are 9 different types of Poring living in Midgard.",
    "answer": "False (X)"
  },
  {
    "id": 138,
    "question": "Kafra Corporation headquarters is located in the city of canals, Alberta.",
    "answer": "False (X)"
  },
  {
    "id": 139,
    "question": "The border city Morroc has a flourishing cotton industry.",
    "answer": "True (O)"
  },
  {
    "id": 140,
    "question": "Currently there are 9 different types of masked Goblins in Midgard.",
    "answer": "False (X)"
  },
  {
    "id": 141,
    "question": "Vagabond Wolves become stronger at night.",
    "answer": "True (O)"
  },
  {
    "id": 142,
    "question": "Eclipses love the scent of Durian Grass.",
    "answer": "True (O)"
  },
  {
    "id": 143,
    "question": "The accessory worn by Baphomet is known as the Demon Ring.",
    "answer": "True (O)"
  },
  {
    "id": 144,
    "question": "Legend has it a Nightmare’s eyes have the power to see into a person’s heart.",
    "answer": "True (O)"
  },
  {
    "id": 145,
    "question": "The Mini Deviling is a large monster.",
    "answer": "False (X)"
  },
  {
    "id": 146,
    "question": "Assassins will always enter hiding when using rolling or hiding skills.",
    "answer": "True (O)"
  },
  {
    "id": 147,
    "question": "Ragnarok is a game that is adapted from a manhwa.",
    "answer": "True (O)"
  },
  {
    "id": 148,
    "question": "A Poring‘s favorite food is apple juice.",
    "answer": "True (O)"
  },
  {
    "id": 149,
    "question": "The Worn Out Scroll and Alcohol are drops from Undead monsters.",
    "answer": "False (X)"
  },
  {
    "id": 150,
    "question": "MVPs and Minis summoned using the Bloody Branch can only exist for a maximum of 1 hour.",
    "answer": "True (O)"
  },
  {
    "id": 151,
    "question": "Drake’s Crow is always perched on his left shoulder.",
    "answer": "True (O)"
  },
  {
    "id": 152,
    "question": "Geffen is home to the Mage Guild.",
    "answer": "True (O)"
  },
  {
    "id": 153,
    "question": "Shattering Shrooms don’t just appear at night. They can be gathered on sunny days as well.",
    "answer": "False (X)"
  },
  {
    "id": 154,
    "question": "When taking part in Guild KVM, party members of the same faction can be from different guilds.",
    "answer": "False (X)"
  },
  {
    "id": 155,
    "question": "You can catch 6 different types of fish in the Underwater Cave.",
    "answer": "True (O)"
  },
  {
    "id": 156,
    "question": "When showing off his biceps, Hollgrehenn likes to raise both arms first before raising his right arm.",
    "answer": "False (X)"
  },
  {
    "id": 157,
    "question": "Three lotuses bloom at Payon’s Bright Lotus Pond.",
    "answer": "True (O)"
  },
  {
    "id": 158,
    "question": "W is known as Kafra’s Miss Popular.",
    "answer": "True (O)"
  },
  {
    "id": 159,
    "question": "Everyone uses their left arm in the Tavern’s Arm Wrestling minigame.",
    "answer": "False (X)"
  },
  {
    "id": 160,
    "question": "The Moonlight Flower has beautiful red pupils.",
    "answer": "True (O)"
  },
  {
    "id": 161,
    "question": "The red stripes on a King Dramoh are scars from being boiled at high temperatures.",
    "answer": "True (O)"
  },
  {
    "id": 162,
    "question": "You can use a Panacea to remove the debuff from getting hit by Phreeoni’s Acid Rain attack.",
    "answer": "True (O)"
  },
  {
    "id": 163,
    "question": "A Katar deals 100% damage to Medium and Small monsters.",
    "answer": "False (X)"
  },
  {
    "id": 164,
    "question": "During Wilderness AFK, party size is proportional to the bonus coefficient.",
    "answer": "True (O)"
  },
  {
    "id": 165,
    "question": "You can obtain Orange Equipment via the following methods: MVP, Mini, Exchange Center, and Equipment Vending Machine.",
    "answer": "True (O)"
  },
  {
    "id": 166,
    "question": "On the Skills page, active skills are presented in round icons.",
    "answer": "True (O)"
  },
  {
    "id": 167,
    "question": "On the Skills page, passive skills are presented in square icons.",
    "answer": "True (O)"
  },
  {
    "id": 168,
    "question": "When the skill settings are on Auto, the level of active skills cannot be adjusted.",
    "answer": "False (X)"
  },
  {
    "id": 169,
    "question": "You can purchase the Neuralizer from Alberta’s Crystal Store and use it to reset skill points.",
    "answer": "True (O)"
  },
  {
    "id": 170,
    "question": "You can purchase the Magical Stone from Alberta’s Crystal Store and use it to reset attribute points.",
    "answer": "True (O)"
  },
  {
    "id": 171,
    "question": "Ultimate Showdown is fair and balanced.",
    "answer": "True (O)"
  },
  {
    "id": 172,
    "question": "By participating in Ultimate Showdown, a player can get a lot of Shadow Equipment upgrade materials.",
    "answer": "True (O)"
  },
  {
    "id": 173,
    "question": "Yoyo‘s favorite fruit is a Juicy Grape.",
    "answer": "True (O)"
  },
  {
    "id": 174,
    "question": "A Baby Desert Wolf‘s favorite food is Animal Gore.",
    "answer": "False (X)"
  },
  {
    "id": 175,
    "question": "Odin’s Blessing only works on monsters within 3 levels of the caster.",
    "answer": "False (X)"
  },
  {
    "id": 176,
    "question": "Odin’s Blessing can only be obtained from Daily Missions.",
    "answer": "False (X)"
  },
  {
    "id": 177,
    "question": "Participating in the Tavern Minigame can get you Stamina Potions.",
    "answer": "True (O)"
  },
  {
    "id": 178,
    "question": "Kafra Service Employees can teleport you to cities that you have never visited before.",
    "answer": "True (O)"
  },
  {
    "id": 179,
    "question": "When capturing pets, the lower the monster’s HP, the higher the success rate.",
    "answer": "True (O)"
  },
  {
    "id": 180,
    "question": "For the additional rewards of Odin’s Blessing, item dropping from monsters is not bound by level reduction.",
    "answer": "True (O)"
  },
  {
    "id": 181,
    "question": "When you kill a monster in the normal state, item dropping from the monster is bound by level reductions.",
    "answer": "True (O)"
  },
  {
    "id": 182,
    "question": "You can purchase the Change Name Card in the game to change your character’s name.",
    "answer": "True (O)"
  },
  {
    "id": 183,
    "question": "You can unlock higher enchantment levels by increasing Favor with NPCs.",
    "answer": "True (O)"
  },
  {
    "id": 184,
    "question": "Only heterosexual couples are allowed in the game.",
    "answer": "False (X)"
  },
  {
    "id": 185,
    "question": "The Automatic Fishing Rod can be exchanged with Fish Print Commemorative Coins in the game.",
    "answer": "True (O)"
  },
  {
    "id": 186,
    "question": "Priest’s skill Sanctuary can deal damage to the undead and demons.",
    "answer": "True (O)"
  },
  {
    "id": 187,
    "question": "There are 4 progress chests in the Carnival.",
    "answer": "False (X)"
  },
  {
    "id": 188,
    "question": "Only Swordmen can engage in Cavalry Combat.",
    "answer": "False (X)"
  },
  {
    "id": 189,
    "question": "Tilt your head and open your mouth slightly when applying eye drops so that you won’t blink easily.",
    "answer": "True (O)"
  },
  {
    "id": 190,
    "question": "When dust gets into your eyes, close your eyes and cough a few times, and the dust will come out by itself.",
    "answer": "True (O)"
  }
]