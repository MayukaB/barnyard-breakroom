// Words that Biscuit and Marshmallow boards are built from (scripts/make-biscuit.mjs).
// Everyday words only: no names, no abbreviations, nothing rude or sad. Plurals are left out so
// a board never hinges on a stray S. Add words to any list; the next run of make-biscuit can use them.
const lists = {
  3: `ace act add age ago aid aim air all and ant ape apt arc arm art ash ask ate awe axe bag bat bay bed bee beg bet
      bib big bin bit bog bow box boy bud bug bun bus but buy cab can cap car cat cob cod cow cozy cry cub cup cut dab dad
      day den dew did dig dim dip dog dot dry due dug ear eat egg elf elk elm end era eve ewe eye fan far fed fee few fig
      fin fir fit fix flu fly fog for fox fun fur gap gem get gift gum gut hag ham hat hay hen her hid him hip his hit hog
      hop hot how hub hue hug hum hut ice icy ink inn ivy jam jar jaw jay jet jig job jog joy jug keg key kid kin kit lab
      lad lag lap law lay led leg let lid lip lit log lot low mad map mat may men met mid mix mob mop mud mug nap net new
      nod nor not now nut oak oar oat odd off oil old one orb our out owl own pad pal pan paw pay pea peg pen pet pie pig
      pin pit pod pop pot pro pub pug pun pup put rag ram ran rap rat raw ray red rib rid rim rip rob rod rot row rub rug
      run rut rye sad sag sap sat saw say sea see set sew shy sip sit six ski sky sly sob sod son sow soy spa spy sub sum
      sun tab tag tan tap tar tea ten tie tin tip toe ton top tot tow toy try tub tug two urn use van vat vet vow wag war
      was wax way web wed wet who why wig win wit wok won woo yak yam yap yarn yes yet yew you zap zip zoo`,
  4: `able acre aged also arch area army aunt away baby back bake bald ball band bank bark barn base bath bead beak beam
      bean bear beat bell belt bend best bike bill bird bite blue blur boat body bold bolt bone book boot born boss both
      bowl brew brim bulb bump bunk burn bush busy cafe cage cake calf calm came camp cane cape card care cart case cash
      cave cell chat chef chin chip chop city clam clap claw clay clip club clue coal coat code coil coin cold comb come
      cone cook cool cope copy cord core corn cost cozy crab crew crib crop crow cube cuff curl cute dance dare dark dart
      dash date dawn deal dear deck deep deer desk dial dice dine dish dive dock doll dome done door dose dove down doze
      drag draw drew drip drop drum duck dune dusk dust duty each earl earn ease east easy echo edge else epic even ever
      face fact fade fair fall fame farm fast fawn fear feed feel feet fern file fill film find fine fire firm fish fist
      five flag flap flat flew flip flow foal foam fold folk fond font food foot fork form fort foul four free frog from
      fuel full fund fuse gain gale game gate gave gaze gear gift glad glow glue goal goat gold golf gone good gown grab
      gray grew grin grip grow gulf gust hail hair half hall halo hand hang hare harp hawk haze head heal heap hear heat
      held helm help herb herd here hero hide high hike hill hint hive hold hole home hood hoof hook hope horn host hour
      huge hull hump hunt hush idea inch iron isle item jazz jolt joke jump just keen keep kelp kept kick kind king kite
      kiwi knee knit knob knot know lace lack lady laid lake lamb lamp land lane lark last late lawn lazy lead leaf leak
      lean leap left lend lens less lift like lily lime line link lion list live load loaf loan lock loft long look loop
      lord lore lost loud love luck lull lump lure lush made mail main make mane many mare mark mash mask mast mate maze
      meal mean meet melt memo mend menu mere mild milk mill mind mine mint mist mitt moat mode mole mood moon moor more
      moss most moth move much mule muse must name navy near neat neck need nest news next nice nine node none nook noon
      norm nose note oath oboe once only onto open oval oven over pace pack page paid pail pain pair pale palm pane park
      part pass past path peak pear peel perk pest pick pier pike pile pine pink pint pipe plan play plot plow plum plus
      poem poet pole poll pond pony pool poor pore pork port pose post pour pray prop pull pulp pump pure push quay quiz
      race rack raft rain rake ramp rang rare rate read real reed reef rein rely rent rest rice rich ride ring ripe rise
      road roam roar robe rock rode role roll roof room root rope rose rosy ruby rule rush rust sack safe sage said sail
      sake sale salt same sand sang sash save seal seam seat seed seek seem seen self sell send sent shed ship shoe shop
      shot show side sift sign silk sill sing sink site size skip slab sled slid slim slip slot slow snap snow soak soap
      soar sock sofa soft soil sold sole some song soon sort soup sour span spin spot spur star stay stem step stew stir
      stop such suit sung sure swan swap sway swim tack tail take tale talk tall tame tank tape task team tear teal tell
      tend tent term test than that them then they thin tick tide tidy tile till time tiny tire toad toast told toll tone
      took tool tops tore torn tour town trap tray tree trim trio trip true tuba tube tuck tulp tuna tune turn twig twin
      type ugly undo unit upon urge used vase vast veil vein verb very vest view vine visit vote wade wage wait wake walk
      wall wand want ward warm warn wash wave weak wear weed week well went were west what when whip wick wide wife wild
      will wind wing wink wire wise wish with woke wolf wood wool word wore work worm wrap wren yard yarn year yell yolk
      your zero zinc zone zoom`,
  5: `about above acorn actor adapt adore adult after again agent agree ahead alarm album alert alike alive allow alone
      along aloud amaze amber amble among ample angel anger angle ankle apple apply apron arena argue arise aroma arrow
      aside atlas attic award aware awful bacon badge bagel baker basic basin basil batch beach beard beast begin being
      belly bench berry bible bike birch birth biscuit black blade blame bland blank blast blaze blend bless blink block
      bloom blown board boast bonus boost booth bored bough bound brain brake brand brass brave bread break breed brick
      bride brief bring brisk broad broke brook broom brown brush buddy build built bunch bunny burst cabin cable cacao
      camel canal candy canoe cargo carol carry carve catch cater cause cedar chain chair chalk champ charm chart chase
      cheap check cheek cheer chess chest chick chief child chill chime chirp choir chord chore chunk cider cinch civic
      claim clank clash clasp class clean clear clerk click cliff climb cling cloak clock close cloth cloud clove clown
      coach coast cobra cocoa coral couch count court cover crack craft crane crate crawl crazy cream creek crest crisp
      croak crowd crown crumb crust cubic curly curve cycle daily dairy daisy dance dandy dealt decal decor delay delta
      dense depot depth diary diner disco ditch diver dizzy dodge dough dozen draft drain drama drank drawn dream dress
      dried drift drill drink drive drove dunes dwell eager eagle early earth easel eaten ebony eight elbow elder elect
      elite ember empty enjoy enter entry equal equip erase essay event every exact extra fable facet faint fairy faith
      false fancy feast fence ferry fetch fever fiber field fifth fifty final finch first flair flake flame flank flash
      flask fleet flesh flick fling flint float flock flood floor flora flour fluff fluid flute focal focus foggy forge
      forth forty forum found frame fresh frill frost froth froze fruit fudge funny gauge giant given glade glass gleam
      glide globe gloom glory glove gnome goose gourd grace grade grain grand grant grape graph grasp grass grate gravy
      graze great green greet grill grind groan groom group grove growl grown guard guess guest guide habit happy hardy
      harsh hatch haven heart heavy hedge hello hence herbs heron hippo hobby holly honey horse hotel hound house hover
      human humid humor hurry husky ideal igloo image inbox index inlet inner input ivory jelly jewel joint jolly judge
      juice juicy jumbo kayak kebab knack knead kneel knelt knife knock koala label ladle large laser latch later laugh
      layer learn leash least leave ledge lemon level lever light lilac limit linen liner lodge lofty logic loose lotus
      lower loyal lucky lunar lunch lyric magic maize major maker mango manor maple march marsh match maybe mayor meadow
      medal melon mercy merit merry metal meter midst might mimic minor minty mirth mixer model moist money month moose
      moral motor motto mound mount mouse mouth movie muddy mural music naive nerve never newly niece night noble noise
      north notch noted novel nudge nurse nutty oasis ocean offer often olive onion onset opera orbit order organ otter
      ought ounce outer owner oxide paddy paint panda panel pansy paper parka party pasta paste patch pause peace peach
      pearl pecan pedal penny perch petal phase phone photo piano picky piece pilot pinch pizza place plaid plain plane
      plank plant plate plaza plead pleat plume plump plush poach point polar polka porch pouch pound power press price
      pride prime print prize proof proud prune pudding puppy purse quack quail quake quart queen quest quick quiet quilt
      quirk quite quote radar radio rainy raise rally ranch range rapid raven reach react ready realm rebel recap reach
      refer relax relay relic remix renew reply rhyme ridge rifle right rigid rinse ripen risen river roast robin robot
      rocky rodeo roost rouge rough round route rover royal rugby ruler rumba rural rusty saint salad salon salsa sandy
      sauce sauna scale scarf scene scent scone scoop scoot scope score scout scrub seize sense serve seven shade shake
      shall shape share shark sharp shawl sheep sheet shelf shell shift shine shiny shire shirt shore short shout shrub
      shrug siege sight silky silly since skate skill skirt skunk slate sleek sleep sleet slept slice slide slope sloth
      small smart smell smile smock smoke snack snail snake sneak sniff snore snowy snuck sober solar solid solve sonic
      sorry sound south space spade spare spark speak spear speed spell spend spent spice spicy spike spill spine spoke
      spoon sport spout spray spree sprig squad squid stack staff stage stair stake stalk stamp stand stare start state
      steak steam steel steep steer stick still sting stir stock stole stomp stone stood stool store stork storm story
      stove straw stray strum stuck study stuff stump style sugar suite sunny super surge swamp swarm sweat sweep sweet
      swept swift swing swirl sword syrup table taken tango tasty teach teapot teddy teeth tempo tense tenth thank theme
      there thick thing think third thorn those three threw throw thumb thyme tiara tiger tight timer tired title toast
      today token tonic tooth topic torch total touch tough towel tower toxic trace track trade trail train trait treat
      trend trial tribe trick tried troop trout truck truly trunk trust truth tulip tuner tunic tutor twice twirl twist
      ultra uncle under unity until upper upset urban usage usual utter valid value vapor vault verse video vigor villa
      vinyl viola viper virus visit vista vital vivid vocal voice vowel wafer wagon waist waltz watch water waver weave
      wedge wheat wheel where which while whisk whole whose widen width windy wiser witty woken woman world worry worth
      would woven wrist write wrote yacht yearn yeast yield young youth zebra zesty`,
  6: `absent accent across action active advice afford agenda almond amount anchor animal annual answer anthem anyway
      appear archer arctic around arrive artist ascend asleep aspect assist attach attend autumn avenue badger ballet
      bamboo banana banner barley barrel basket beacon beaker beaver become bedbug beetle before behave behind belong
      better beyond bishop blanket blazer blouse bonnet border borrow bottle bottom bounce branch breeze bridge bright
      broken bronze bubble bucket budget bundle burrow butter button cactus camera candle canyon carpet carrot castle
      casual cattle cellar cement center cereal chance change chapel charge cheese cherry chorus church cinema circle
      circus citrus clever client closet cobweb coffee collar colony column combat comedy comfort common cookie copper
      corner cotton cousin cradle crayon credit crisis cuddle custom dainty dancer danger dazzle decade decide deeply
      defend degree delete demand desert design detail device dinner direct divide doctor dollar donkey double dragon
      drawer dreamy driver duffel during easily effect effort eighty either eleven empire enable endure energy engine
      enough entire escape estate ethnic evenly excite expect expert fabric facing factor fairly family famous farmer
      fasten father fellow fennel fender fiddle figure filter finger finish flavor flight floral flower folder follow
      forest forget formal fossil foster fridge friend frozen fruity funnel future galaxy garage garden garlic gather
      gentle giggle ginger glance glider global gloomy gobble golden gopher gospel gravel grocer ground growth guitar
      hammer handle happen harbor hearth heater hectic height helmet herald hermit hiccup hidden hiking hollow honest
      hoodie hopper horror hunger hunter hurdle icicle island jacket jaguar jersey jigsaw jingle jogger jovial jumble
      jungle junior kennel kettle kidney kitten knight ladder lagoon lambda lament lanyard laptop larder lately launch
      lavish lawyer layout leader league legend lemony length lesson letter lights likely liquid little lively lizard
      locker locket lovely luxury magnet maiden mallet manner marble margin market meadow medium mellow member memory
      mentor merely method middle mingle minute mirror misty mitten modern moment monkey mostly mother motion muffin
      museum mussel mutton napkin narrow nature nearby neatly needle nettle nickel noodle normal notice number nutmeg
      object office online orange orchid origin outfit oyster paddle palace pantry parade parcel parrot pastel patrol
      peanut pebble pencil people pepper period pickle picnic pigeon pillow pirate planet plenty pocket poetry police
      polish pollen poncho potato powder praise prince prison profit public puffin puppet purple puzzle rabbit racoon
      radish random ranger rattle reason recipe record reform relish remote rescue result return reward ribbon riddle
      ripple rocket rodent roster rubber rudder saddle safari salmon sample sandal saucer scarce school scroll season
      secret select sensor sequel settle shadow shield shovel shower signal silver simple singer single sister sketch
      slight smooth snacks socket sorbet sphere spider spinal spiral splash spoken sponge spring sprout square squash
      squeak stable staple starch statue steady stitch strand stream street stride string stripe strong studio subtle
      summer summit sunset supper supply switch symbol tablet tackle talent tangle target teapot temple tender tennis
      thirty thread throne ticket tickle timber tiptoe toffee tomato tongue toucan travel trophy tunnel turkey turnip
      turtle tuxedo twelve twenty unfold unique unlock update useful valley velvet violet vision volume voyage waffle
      walnut walrus wander warmth weasel weekly window winner winter wisdom within wizard wonder wooden woolly worthy
      yellow yogurt zipper`,
  7: `abandon account achieve acrobat address advance against airport alcove amazing ancient animals another anxious
      apricot archway arrange article athlete auction average awesome balance balloon bandage banquet baptism bargain
      barrier battery bedtime beehive believe benefit between bicycle biscuit blanket blossom bouquet bramble breathe
      brother buffalo builder bulldog bunting burrito cabbage cabinet caramel caravan careful carrier cartoon cashier
      catalog central century certain chamber channel chapter charity chicken chimney chipmunk circuit citizen classic
      climate clothes cluster coastal cobbler collect college colonel comfort command comment compass complex concert
      console contact content contest control convert cooking correct costume cottage council counter country courage
      cowbell crackle crested cricket crimson crochet crystal cuckoo culture cupcake curious current curtain cushion
      custard cutlery dazzled deliver dentist desktop dessert diamond digital dinghy dolphin donated drawing dreamer
      drizzle dumplin eastern economy edition elegant element embrace emerald enchant endless engaged english enhance
      evening example excited exhibit explore express extreme factory fantasy farming fashion feather feature festive
      fiction fifteen finally fitness flannel flutter foliage forever fortune forward founder freedom fritter frosted
      furnace furious gallery garland general genuine giraffe glimmer glisten goldfish gondola gorilla gradual granite
      gravity grocery habitat haircut halfway hamster harbour harmony harvest hatchet haycart healthy hearing heating
      heather helpful herself highway himself history holiday horizon housing however hundred hunting husband iceberg
      imagine improve include inspire instant interest invited jasmine javelin jewelry journal journey jukebox justice
      kayaker kestrel kingdom kitchen knitted lantern largely lasagna laundry lawsuit learner leather lecture leisure
      leopard lettuce liberty library lighter limited lobster lullaby luggage machine mailbox mammoth mandate mansion
      marble marital marshal mascara massive meadows measure melody member mention message militia minimum minnows
      miracle mission mixture monarch monster morning mustard mystery natural neither network nightly nothing nowhere
      nursery nutmeg oatmeal obvious octopus officer offline opinion orchard organic ostrich outdoor outline overall
      package pajamas painter pancake panther paprika parking parsley partner passage passion pasture patient pattern
      payment peacock peasant pelican penguin pension perfect perhaps picture pilgrim pioneer planner plastic platter
      playful plumber popcorn popular portion postage pottery poultry prairie precise premier present pretzel primary
      printer privacy problem process produce product program project promise prosper protect provide pudding pumpkin
      puzzled pyramid quality quarter radiant rainbow rambler reading reality recital records recover redwood reflect
      regular related release remains removal replace request reserve respect restful revenue rooster routine sailing
      sailboat sandbox sapling sardine satchel sausage scatter scenery scholar science scooter scratch seaside seasons
      section serious service session setting several shelter sheriff shimmer shortly shyness sillier sincere sixteen
      skillet slipper snapper snuggle soldier someone sparkle sparrow special spinach sponsor squeeze stadium station
      steamer stellar sterile storage strange stretch student subject success sunbeam sunlamp sunrise support supreme
      surface surgeon surplus survive swallow sweater teacher tearoom tedious texture theater thimble thistle thought
      thunder tickets tidings tinsel toaster tobacco tonight topping tornado tourism tractor traffic trainer trellis
      tribute trinket trumpet tuition turmoil twinkle typical unicorn uniform unknown unusual upright utensil vacancy
      vaccine vanilla variety various velvety venture version veteran village vintage violent virtual visible visitor
      volcano voucher vulture waggled waiting walking wardrobe warrior washing weather website wedding weekend welcome
      western whisker whistle willing willow windmill winning without witness wonders workday worship writing yodeler`,
  // Longer words, for the Signpost's tall pole.
  8: `airplane alphabet backpack backyard barnyard baseball bathrobe birthday blizzard bookcase bookmark bracelet
      broccoli building bullfrog calendar campfire cardigan carousel cheerful chipmunk cinnamon clothing cupboard
      daffodil dinosaur doorbell dumpling elephant festival fireside firework flamingo floating football friendly
      frosting gardener goldfish grateful hedgehog homework honeybee hospital jamboree kangaroo keyboard kindness
      ladybird lavender lemonade lollipop magazine mandolin marigold meatball midnight mosquito mountain mushroom
      necklace notebook nutshell ornament overcoat painting pinecone pinwheel playtime pleasant porridge postcard
      princess question raincoat reindeer rosemary sandwich scramble seahorse seashell shamrock sidewalk sleeping
      snowball snowfall snowshoe songbird sparkler spinning starfish sunlight sunshine surprise teaspoon thankful
      thinking tortoise treasure triangle umbrella vacation vineyard wildlife windmill woodland workshop yearbook
      zucchini`,
  9: `adventure afternoon alligator astronaut avalanche backstage bandstand beekeeper blueberry bookshelf breakfast
      brilliant bumblebee butterfly buttercup candlelit cardboard carnation celebrate chocolate classroom coastline
      crocodile dandelion dragonfly evergreen fireplace flowerpot footprint gardening goldfinch grapevine grassland
      hamburger happiness harmonica hollyhock honeycomb hopscotch horseshoe jellyfish marmalade milkshake moonlight
      nightfall orchestra pineapple playhouse porcupine raspberry saxophone scarecrow snowflake snowstorm spaghetti
      sunflower tangerine telescope treehouse twinkling valentine vegetable volunteer waterfall whirlwind wonderful
      yesterday`,
};

// Keep only words of the list's own length and plain letters, drop repeats, and remove a few that
// slipped in above but read badly on a family puzzle.
const BLOCK = new Set([
  "bible",
  "virus",
  "toxic",
  "siege",
  "rifle",
  "militia",
  "violent",
  "prison",
  "police",
  "lawsuit",
  "tobacco",
  "vaccine",
  "baptism",
  "sterile",
  "turmoil",
  "combat",
  "danger",
  "crisis",
  "horror",
  "sword",
  "abandon",
  "marital",
  "mascara",
  "lambda",
  "ethnic",
  "gospel",
  "worship",
  "husband",
  "surgeon",
  "officer",
  "colonel",
  "marshal",
  "sheriff",
  "soldier",
  "warrior",
  "hag",
  "war",
  "rob",
  "gut",
  "hunting",
  "hunter",
  "furious",
  // not words, or plurals and spellings that don't fit the rules above
  "tulp",
  "dumplin",
  "haycart",
  "harbour",
  "sunlamp",
  "racoon",
  "ultra",
  "minnows",
  "animals",
  "meadows",
  "records",
  "tickets",
  "seasons",
  "wonders",
  "remains",
  "tidings",
  "herbs",
  "dunes",
  "tops",
  "snacks",
  "news",
  "english",
]);
export const WORDS = {};
for (const [len, text] of Object.entries(lists)) {
  const n = Number(len);
  WORDS[n] = [
    ...new Set(
      text
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.toUpperCase()),
    ),
  ].filter((w) => w.length === n && /^[A-Z]+$/.test(w) && !BLOCK.has(w.toLowerCase()));
}
