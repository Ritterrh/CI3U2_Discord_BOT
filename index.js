const {
    Client, GatewayIntentBits, Routes, ApplicationIconFormat, ActivityType, Application, ApplicationCommand,
    EmbedBuilder, ChatInputCommandInteraction, userMention, roleMention
} = require('discord.js');
const dotenv = require('dotenv');
const {REST} = require('@discordjs/rest');
const mysql = require('mysql');
const {send} = require("ajax");

const client = new Client({intents: [GatewayIntentBits.Guilds]});
dotenv.config();

const host = process.env.DATENBANK_HOST;
const db = process.env.DATENBANK;
const user = process.env.DATENBANK_USER;
const pw = process.env.DATENBANK_PASS;
const token = process.env.TOKEN;
const gui = process.env.GUILD_ID;
const application = process.env.APPLICATION_ID;

const gamesPerPage = 10;

const con = mysql.createConnection(
    {
        host: host,
        database: db,
        user: user,
        password: pw,
    }
);
con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});


const rest = new REST({version: '10'}).setToken(token);

const commands = [

    {
        name: 'restart',
        description: 'Restarts the bot',
        type: 1,
    },
    {
        name: 'meme',
        description: 'Sends a meme',
        type: 1,
        delay: 7000,
    },
    {
        type: 1,
        name: 'games',
        description: 'Die 10 ersten Spiel aus der datenbank senden',

    },
    {
        type: 1,
        name: 'cha',
        description: 'Erstellt eine Hausaufgabe',
        autocomplete: true,
        options: [
            {
                name: 'fach',
                description: 'Fach der Hausaufgabe',
                type: 3,
                required: true,
            },
            {
                name: 'beschreibung',
                description: 'Beschreibung der Hausaufgabe',
                type: 3,
                required: true,
            },
            {
                name: 'bis_wann',
                description: 'Bis wann die Hausaufgabe fertig sein muss',
                type: 3,
                required: true,
            },
        ],
    },
];

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'meme') {
        try {
            const response = await fetch("https://www.reddit.com/r/memes/random/.json");
            const data = await response.json();
            const randomMeme = data[0].data.children[0].data;

            const embed = new EmbedBuilder()
                .setTitle(`Random Meme | ${randomMeme.title}`)
                .setImage(randomMeme.url)
                .setColor("#FF00A6")

            await interaction.reply({embeds: [embed]});
        } catch (err) {
            console.log(err);
        }
    }
});


client.login(token).then(r => console.log('Logged in!'));
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(application, gui),
            {body: commands},
        );


        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    client.user.setPresence({
        status: 'online',
        activities: [{
            name: 'Ab auf Feld mit euch!',
            type: ActivityType.Streaming
        }],
    });

});


client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'restart') {
        await interaction.reply('Restarting...')
        await client.destroy().then(() =>
            console.log('Restarting...')).then(() =>
            client.login(token)).then(() =>
            console.log('Logged in!'))
    }
});


client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'games') {
        console.log("FG")
        try {
            await con.query(
                'SELECT' +
                ' s.spiel_id,' +
                ' s.spiel_name,' +
                ' s.spiel_reals_date,' +
                ' s.spiel_preis,' +
                ' f.FS_alter,' +
                ' st.ST_anzahl,' +
                ' bp.PB_name,' +
                ' e.EN_name,' +
                ' g.GE_name,' +
                ' GROUP_CONCAT(k.KO_name) AS Plattformen' +
                ' FROM spiel s' +
                ' LEFT JOIN sterne st ON s.spiel_sterne= st.SID' +
                ' LEFT JOIN fsk f ON s.spiel_fsk = f.FID' +
                ' LEFT JOIN spiel_plattform sk ON s.spiel_id = sk.Spiel_ID' + // Join conditions for genres
                ' LEFT JOIN konsole k ON sk.Konsole_Id = k.KID' + // Join conditions for genre relationships
                ' LEFT JOIN spiel_genere sg ON s.spiel_id = sg.SPID' +
                ' LEFT JOIN genere g ON sg.GID = g.GID' +// Join conditions for publisher
                ' LEFT JOIN spiel_publisher sp ON s.spiel_id = sp.SPID' +
                ' LEFT JOIN publisher bp ON sp.PID = bp.PID' +// Join conditions for developer
                ' LEFT JOIN spiel_entwickler se ON s.spiel_id = se.SPID' +
                ' LEFT JOIN entwickler e ON se.EID = e.EID' +
                ' GROUP BY s.spiel_id, s.spiel_name, s.spiel_reals_date, s.spiel_preis, f.FS_alter, st.ST_anzahl, bp.PB_name, e.EN_name, g.GE_name',
                async (err, rows) => {
                    if (err) {
                        console.error(err);
                        return;
                    }

                if (rows.length === 0) {
                    await interaction.reply('Spiel nicht gefunden.');
                    return;
                }

                    const totalPages = Math.ceil(rows.length / gamesPerPage);
                    const page = 1;

                    const startIndex = (page - 1) * gamesPerPage;
                    const endIndex = startIndex + gamesPerPage;
                    const gamesOnPage = rows.slice(startIndex, endIndex);




                    const embeds = [];
                    for (const game of gamesOnPage) {
                        const Name = game.spiel_name;
                        const Reals = game.spiel_reals_date;
                        const Preis = game.spiel_preis;
                        const Plattformen = game.Plattformen;
                        const Sterne = game.ST_anzahl;
                        const FSK = game.FS_alter;
                        const Publisher = game.PB_name;
                        const Entwickler = game.EN_name;
                        const Genere = game.GE_name;

                        const embed = new EmbedBuilder()
                            .setTitle(`Spiel: ${Name}`)
                            .setDescription(`
                                Publisher: ${Publisher}
                                Entwickler: ${Entwickler}
                                Platformmen: ${Plattformen}
                                FSK: ${FSK}
                                Genere: ${Genere}
                                Reals: ${Reals}
                                Sterne: ${Sterne}
                                Preis: ${Preis}€\n
                                Bot by: ${userMention('716299791465971772')}`)
                            .setColor("#FF00A6");

                        embeds.push(embed);
                    }

                    await interaction.reply( { embeds: embeds, content: "Hey alle spiele findest du unter http://api.filmprojekt1.de/api/game oder http://nabeba.filmprojekt1.de/news/ "});

                })
        } catch (err) {
            console.error(err);
        }
    }
});



    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;

        if (interaction.commandName === 'cha') {
            const Fach = interaction.options.get('fach').value;
            const Beschreibung = interaction.options.get('beschreibung').value;
            const Bis_wann = interaction.options.get('bis_wann').value;
            try {
                const embed_hausaufgaben = new EmbedBuilder()
                    .setTitle(`**Hausaufgabe:** ${Fach}`)
                    .setTimestamp()
                    .setDescription(`
                **Beschreibung:**\n
                 ${Beschreibung}\n
                 **Bis wann:**\n
                 ${Bis_wann} 
                \n${roleMention('1140687167958552636')}`)
                    .setColor("#FF00A6");

                await interaction.reply({embeds: [embed_hausaufgaben]});
            } catch (err) {
                console.error(err);
            }

        }
    });


    function sendEmbeddedMessage() {
        const channelId = '1142069220109197413'; // Ersetze durch die ID deines gewünschten Kanals
        const channel = client.channels.cache.get(channelId);

        if (!channel) {
            console.log('Kanal nicht gefunden.');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('GOKU IST STÄKER')
            .setDescription('DIE WICHTIGES REGEL AUF DEM DC')
            .setColor('#00FF00'); // Farbe des Embeds

        channel.send({embeds: [embed]})
            .then(() => console.log('Nachricht gesendet.'))
            .catch(error => console.error('Fehler beim Senden der Nachricht:', error));
    }


    async function getTimetableForWeek() {
        const date = new Date('2023-08-21');
        await units.login();
        console.log('Logged in');
        console.log('Getting timetable')
        let RoomName;
        let SubjectName;
        let SubjectID;
        const timetable = await units.getOwnTimetableForWeek(date);
        timetable.forEach((element) => {


            element.subjects.forEach((subject) => {
                SubjectName = subject.element.name;
                SubjectID = subject.id;
                return SubjectName + SubjectID;
            });

            element.rooms.forEach((room) => {
                RoomName = room.element.name;
            });
            console.log(element.date, element.startTime, SubjectName, RoomName, element.endTime,);
            console.log("");
        });


        console.log('Got timetable');


    }
