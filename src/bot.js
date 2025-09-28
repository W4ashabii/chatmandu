require('dotenv').config({ path: './.env' });
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const emojiData = require('emoji.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let elections = new Map();
let voteLog = [];
let globalCommands = [];

function loadData() {
    try {
        if (fs.existsSync('./elections.json')) {
            const data = JSON.parse(fs.readFileSync('./elections.json', 'utf8'));
            elections = new Map(Object.entries(data));
        }
        if (fs.existsSync('./vote_log.json')) {
            voteLog = JSON.parse(fs.readFileSync('./vote_log.json', 'utf8'));
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function saveData() {
    try {
        fs.writeFileSync('./elections.json', JSON.stringify(Object.fromEntries(elections), null, 2));
        fs.writeFileSync('./vote_log.json', JSON.stringify(voteLog, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

function isAccountOldEnough(user) {
    const accountAge = Date.now() - user.createdTimestamp;
    const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;
    return accountAge >= sixMonths;
}

function hasUserVoted(userId, electionId) {
    return voteLog.some(vote => vote.userId === userId && vote.electionId === electionId);
}

function generateElectionId() {
    return Math.random().toString(36).substring(2, 8);
}

function parseDuration(durationStr) {
    if (!durationStr) return 3 * 24 * 60 * 60 * 1000; // Default: 3 days in milliseconds
    
    const match = durationStr.match(/^(\d+)([dhwm])$/i);
    if (!match) return 3 * 24 * 60 * 60 * 1000; // Default if invalid format
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
        case 'm': return value * 60 * 1000; // minutes
        case 'h': return value * 60 * 60 * 1000; // hours
        case 'd': return value * 24 * 60 * 60 * 1000; // days
        case 'w': return value * 7 * 24 * 60 * 60 * 1000; // weeks
        default: return 3 * 24 * 60 * 60 * 1000; // Default: 3 days
    }
}

function formatDuration(ms) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function convertEmojiNameToEmoji(emojiName) {
    if (!emojiName) {
        return emojiName;
    }

    if (emojiName.startsWith('<:') && emojiName.endsWith('>')) {

        return emojiName;
    }

    if (emojiName.startsWith('<a:') && emojiName.endsWith('>')) {

        return emojiName;
    }

    if (emojiName.startsWith(':') && emojiName.endsWith(':')) {

        const searchName = emojiName.slice(1, -1).toLowerCase();

        const foundEmoji = emojiData.find(emoji => 
            emoji.name.toLowerCase().replace(/[^a-z0-9]/g, '') === searchName.replace(/[^a-z0-9]/g, '') ||
            emoji.name.toLowerCase().includes(searchName) ||
            searchName.includes(emoji.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
        );
        
        if (foundEmoji) {
            return foundEmoji.char;
        }

        const commonEmojis = {
            ':heart:': '❤️', ':cat:': '🐱', ':dog:': '🐶', ':fire:': '🔥', ':star:': '⭐',
            ':thumbsup:': '👍', ':thumbsdown:': '👎', ':smile:': '😊', ':laughing:': '😂',
            ':cry:': '😢', ':angry:': '😠', ':thinking:': '🤔', ':party:': '🎉', ':tada:': '🎊',
            ':balloon:': '🎈', ':gift:': '🎁', ':cake:': '🎂', ':pizza:': '🍕', ':hamburger:': '🍔',
            ':coffee:': '☕', ':beer:': '🍺', ':wine:': '🍷', ':muscle:': '💪', ':ok_hand:': '👌',
            ':clap:': '👏', ':wave:': '👋', ':point_right:': '👉', ':point_left:': '👈',
            ':point_up:': '👆', ':point_down:': '👇', ':eyes:': '👀', ':ear:': '👂', ':nose:': '👃',
            ':mouth:': '👄', ':tongue:': '👅', ':kiss:': '💋', ':love_letter:': '💌', ':ring:': '💍',
            ':gem:': '💎', ':bomb:': '💣', ':gun:': '🔫', ':knife:': '🔪', ':pill:': '💊',
            ':syringe:': '💉', ':moneybag:': '💰', ':credit_card:': '💳', ':dollar:': '💵',
            ':euro:': '💶', ':pound:': '💷', ':yen:': '💴', ':chart:': '📊', ':trophy:': '🏆',
            ':medal:': '🏅', ':crown:': '👑', ':top:': '🔝', ':one:': '1️⃣', ':two:': '2️⃣',
            ':three:': '3️⃣', ':four:': '4️⃣', ':five:': '5️⃣', ':six:': '6️⃣', ':seven:': '7️⃣',
            ':eight:': '8️⃣', ':nine:': '9️⃣', ':ten:': '🔟'
        };
        
        return commonEmojis[emojiName] || emojiName;
    }

    return emojiName;
}

function checkAndEndElections() {
    const now = Date.now();
    const endedElections = [];
    
    for (const [electionId, election] of elections) {
        if (election.endTime && now >= election.endTime && !election.ended) {
            endedElections.push(electionId);
        }
    }
    
    return endedElections;
}

async function endElection(electionId) {
    const election = elections.get(electionId);
    if (!election || election.ended) return;

    election.ended = true;
    election.endTime = Date.now();

    const sortedCandidates = election.options
        .sort((a, b) => b.votes - a.votes)
        .filter(candidate => candidate.votes > 0);

    const primeMinister = sortedCandidates[0] || null;

    const candidatesAfterPm = sortedCandidates.slice(1);
    const ministers = candidatesAfterPm.slice(0, 4);

    if (ministers.length > 0) {
        const cutoffVotes = ministers[ministers.length - 1].votes;
        for (let i = 4; i < candidatesAfterPm.length; i++) {
            if (candidatesAfterPm[i].votes === cutoffVotes) {
                ministers.push(candidatesAfterPm[i]);
            } else {
                break;
            }
        }
    }

    const resultsEmbed = new EmbedBuilder()
        .setTitle('🏛️ **ELECTION RESULTS** 🏛️')
        .setDescription(`**Election:** ${election.title}\n**Total Votes:** ${election.options.reduce((sum, opt) => sum + opt.votes, 0)}\n**Duration:** ${formatDuration(election.duration)}`)
        .setColor(0x00ff00)
        .setTimestamp()
        .setAuthor({
            name: 'Chatmandu Election Bot',
            iconURL: 'https://cdn.discordapp.com/avatars/1176121220614340668/4c136772e68b63aa9452998f63eb635e.png?size=4096'
        })
        .setFooter({
            text: 'discord.gg/chatmandu',
            iconURL: 'https://cdn.discordapp.com/avatars/1176121220614340668/4c136772e68b63aa9452998f63eb635e.png?size=4096'
        });

    if (primeMinister) {
        resultsEmbed.addFields({
            name: '👑 **PRIME MINISTER** 👑',
            value: `${convertEmojiNameToEmoji(primeMinister.emoji)} **${primeMinister.text}** - ${primeMinister.votes} votes`,
            inline: false
        });
    }

    if (ministers.length > 0) {
        const ministersText = ministers.map((minister, index) => 
            `${index + 1}. ${convertEmojiNameToEmoji(minister.emoji)} **${minister.text}** - ${minister.votes} votes`
        ).join('\n');
        
        resultsEmbed.addFields({
            name: '🏛️ **MINISTERS** 🏛️',
            value: ministersText,
            inline: false
        });
    }

    const allResults = election.options
        .sort((a, b) => b.votes - a.votes)
        .map((candidate, index) => 
            `${index + 1}. ${convertEmojiNameToEmoji(candidate.emoji)} **${candidate.text}** - ${candidate.votes} votes`
        ).join('\n');
    
    resultsEmbed.addFields({
        name: '📊 **COMPLETE RESULTS** 📊',
        value: allResults,
        inline: false
    });

    try {
        if (election.channelId) {
            const channel = client.channels.cache.get(election.channelId);
            if (channel) {
                await channel.send({ embeds: [resultsEmbed] });

                if (election.messageId) {
                    try {
                        const message = await channel.messages.fetch(election.messageId);
                        const endedEmbed = new EmbedBuilder()
                            .setTitle(`🗳️ ${election.title}`)
                            .setDescription(`**${election.description}**\n\n⏰ **ELECTION ENDED** ⏰\n*Results have been announced above!*`)
                            .setColor(0xff0000)
                            .setTimestamp()
                            .setAuthor({
                                name: 'Chatmandu Election Bot',
                                iconURL: 'https://cdn.discordapp.com/avatars/1176121220614340668/4c136772e68b63aa9452998f63eb635e.png?size=4096'
                            })
                            .setFooter({
                                text: 'discord.gg/chatmandu',
                                iconURL: 'https://cdn.discordapp.com/avatars/1176121220614340668/4c136772e68b63aa9452998f63eb635e.png?size=4096'
                            });
                        
                        await message.edit({ 
                            content: '🗳️ **ELECTION ENDED** 🗳️\n*Voting is now closed. Check results above!*',
                            embeds: [endedEmbed],
                            components: [] // Remove voting components
                        });
                    } catch (error) {
                        console.error('Error updating election message:', error);
                    }
                }
            } else {
                console.log(`Channel ${election.channelId} not found for election ${election.id}`);
            }
        } else {
            console.log(`Election ${election.id} was never made public - no channel ID available`);
        }
    } catch (error) {
        console.error('Error sending election results:', error);
    }

    saveData();
    
    return {
        primeMinister,
        ministers,
        totalVotes: election.options.reduce((sum, opt) => sum + opt.votes, 0)
    };
}

async function showDurationSelection(interaction, election, providedDuration) {

    if (providedDuration) {
        const durationMs = parseDuration(providedDuration);
        election.duration = durationMs;
        election.endTime = Date.now() + durationMs;
        election.pendingDurationSelection = false;
        election.pendingEmojiSelection = true;
        elections.set(election.id, election);
        saveData();

        await showEmojiSelection(interaction, election);
        return;
    }

    const durationSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(`duration_select_${election.id}`)
        .setPlaceholder('Choose election duration')
        .addOptions([
            { label: '1 Hour', value: '1h', emoji: '⏰' },
            { label: '6 Hours', value: '6h', emoji: '🕕' },
            { label: '12 Hours', value: '12h', emoji: '🕛' },
            { label: '1 Day', value: '1d', emoji: '📅' },
            { label: '3 Days (Default)', value: '3d', emoji: '🗓️' },
            { label: '1 Week', value: '1w', emoji: '📆' },
            { label: '2 Weeks', value: '2w', emoji: '🗓️' },
            { label: 'Custom Duration', value: 'custom', emoji: '✏️' }
        ]);

    const row = new ActionRowBuilder().addComponents(durationSelectMenu);

    const durationEmbed = new EmbedBuilder()
        .setTitle('⏰ Set Election Duration')
        .setDescription(`**Election:** ${election.title}\n\n**Choose how long the election should run:**\n• Select a preset duration or choose "Custom Duration" to enter your own\n• Default is 3 days if no duration is specified`)
        .setColor(0x00ff00)
        .setThumbnail("https://cdn.discordapp.com/avatars/1176121220614340668/4c136772e68b63aa9452998f63eb635e.png?size=4096");

    await interaction.reply({
        content: `🗳️ **Election Setup Started!**\nElection ID: \`${election.id}\`\n\nPlease select the election duration:`,
        embeds: [durationEmbed],
        components: [row],
        ephemeral: true
    });
}

async function updateEmojiSelectionMessage(interaction, election) {

    const candidateSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(`select_candidate_${election.id}`)
        .setPlaceholder('Choose a candidate to set emoji for')
        .addOptions(
            election.options.map((option, index) => {
                const defaultEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index] || `${index + 1}.`;
                const currentEmoji = option.emoji || 'None';
                const status = option.emoji ? '✅' : '❌';
                
                return {
                    label: `${status} ${option.text}`,
                    description: `Current emoji: ${currentEmoji}`,
                    value: `candidate_${option.id}`
                };
            })
        );

    const row = new ActionRowBuilder().addComponents(candidateSelectMenu);

    const remainingCount = election.options.filter(opt => !opt.emoji).length;
    const totalCount = election.options.length;

    const emojiSelectionEmbed = new EmbedBuilder()
        .setTitle('🎨 Set Emojis for Candidates')
        .setDescription(`**Election:** ${election.title}\n**Duration:** ${formatDuration(election.duration)}\n\n**Progress:** ${totalCount - remainingCount}/${totalCount} candidates have emojis\n\n**Instructions:**\n• Select a candidate from the dropdown below\n• Choose to use default emoji or enter a custom one\n• Repeat until all candidates have emojis\n\nOnce all emojis are set, the election will be created!`)
        .setColor(0x00ff00)
        .setThumbnail("https://cdn.discordapp.com/avatars/1176121220614340668/4c136772e68b63aa9452998f63eb635e.png?size=4096");

    await interaction.editReply({
        content: `✅ **Duration set to:** ${formatDuration(election.duration)}\n\nNow please select emojis for each candidate:`,
        embeds: [emojiSelectionEmbed],
        components: [row]
    });
}

async function showEmojiSelection(interaction, election) {

    const candidateSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(`select_candidate_${election.id}`)
        .setPlaceholder('Choose a candidate to set emoji for')
        .addOptions(
            election.options.map((option, index) => {
                const defaultEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index] || `${index + 1}.`;
                const currentEmoji = option.emoji || 'None';
                const status = option.emoji ? '✅' : '❌';
                
                return {
                    label: `${status} ${option.text}`,
                    description: `Current emoji: ${currentEmoji}`,
                    value: `candidate_${option.id}`

                };
            })
        );

    const row = new ActionRowBuilder().addComponents(candidateSelectMenu);

    const remainingCount = election.options.filter(opt => !opt.emoji).length;
    const totalCount = election.options.length;

    const emojiSelectionEmbed = new EmbedBuilder()
        .setTitle('🎨 Set Emojis for Candidates')
        .setDescription(`**Election:** ${election.title}\n**Duration:** ${formatDuration(election.duration)}\n\n**Progress:** ${totalCount - remainingCount}/${totalCount} candidates have emojis\n\n**Instructions:**\n• Select a candidate from the dropdown below\n• Choose to use default emoji or enter a custom one\n• Repeat until all candidates have emojis\n\nOnce all emojis are set, the election will be created!`)
        .setColor(0x00ff00)
        .setThumbnail("https://cdn.discordapp.com/avatars/1176121220614340668/4c136772e68b63aa9452998f63eb635e.png?size=4096");

    await interaction.followUp({
        content: `✅ **Duration set to:** ${formatDuration(election.duration)}\n\nNow please select emojis for each candidate:`,
        embeds: [emojiSelectionEmbed],
        components: [row],
        ephemeral: true
    });
}

async function showEmojiOptionsForCandidate(interaction, election, candidateId) {
    const candidate = election.options.find(opt => opt.id === candidateId);
    if (!candidate) {
        await interaction.reply({ content: '❌ Candidate not found.', ephemeral: true });
        return;
    }

    const candidateIndex = election.options.findIndex(opt => opt.id === candidateId);
    const defaultEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][candidateIndex] || `${candidateIndex + 1}.`;

    const emojiSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(`emoji_option_${election.id}_${candidateId}`)
        .setPlaceholder(`Choose emoji for: ${candidate.text}`)
        .addOptions([
            { label: `Default: ${defaultEmoji}`, value: `default_${candidateIndex}`, emoji: defaultEmoji },
            { label: 'Type Custom Emoji', value: 'custom_input', emoji: '✏️' }
        ]);

    const row = new ActionRowBuilder().addComponents(emojiSelectMenu);

    const emojiOptionsEmbed = new EmbedBuilder()
        .setTitle(`🎨 Set Emoji for: ${candidate.text}`)
        .setDescription(`**Current emoji:** ${candidate.emoji || 'None'}\n\n**Choose an option:**\n• **Default:** Use numbered emoji (${defaultEmoji})\n• **Custom:** Enter your own emoji`)
        .setColor(0x00ff00)
        .setThumbnail("https://cdn.discordapp.com/avatars/1176121220614340668/4c136772e68b63aa9452998f63eb635e.png?size=4096");

    await interaction.reply({
        content: `🎯 **Setting emoji for:** ${candidate.text}`,
        embeds: [emojiOptionsEmbed],
        components: [row],
        ephemeral: true
    });
}

async function showElectionConfirmation(interaction, election) {

    const confirmationEmbed = new EmbedBuilder()
        .setTitle('🎯 Confirm Election Setup')
        .setDescription(`**Election:** ${election.title}\n**Description:** ${election.description}\n**Duration:** ${formatDuration(election.duration)}\n\n**Selected Emojis:**`)
        .setColor(0x00ff00)
        .setThumbnail("https://cdn.discordapp.com/avatars/1176121220614340668/4c136772e68b63aa9452998f63eb635e.png?size=4096");

    election.options.forEach((option, index) => {
        confirmationEmbed.addFields({
            name: `Option ${index + 1}`,
            value: `${option.emoji} ${option.text}`,
            inline: true
        });
    });

    const confirmButton = new StringSelectMenuBuilder()
        .setCustomId(`confirm_election_${election.id}`)
        .setPlaceholder('Confirm and create public election message')
        .addOptions([
            { label: '✅ Create Public Election', value: 'confirm', emoji: '✅' },
            { label: '❌ Cancel Election', value: 'cancel', emoji: '❌' }
        ]);

    const row = new ActionRowBuilder().addComponents(confirmButton);

    await interaction.followUp({
        content: `🎉 **All emojis selected!**\n\nPlease review your election setup below and confirm to create the public message:`,
        embeds: [confirmationEmbed],
        components: [row],
        ephemeral: true
    });
}

async function createPublicElectionMessage(interaction, election) {

    election.pendingEmojiSelection = false;
    elections.set(election.id, election);
    saveData();

    const embed = await createElectionEmbed(election);
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`vote_${election.id}`)
        .setPlaceholder('Choose your vote...')
        .addOptions(
            election.options.map(option => {

                let emoji = convertEmojiNameToEmoji(option.emoji) || '📋';
                
                return {
                    label: option.text,
                    value: option.id.toString(),
                    emoji: emoji
                };
            })
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const publicMessage = await interaction.followUp({
        content: `🗳️ **LIVE VOTE COUNTER** - ${election.title}\n*Votes update in real-time as people vote*`,
        embeds: [embed],
        components: [row]
    });

    election.publicMessageId = publicMessage.id;
    election.publicChannelId = interaction.channel.id;
    elections.set(election.id, election);
    saveData();

    await interaction.editReply({
        content: `🎉 **Election Created Successfully!**\nElection ID: \`${election.id}\`\n\n✅ All emojis selected! The public election message has been created.\n\nAnyone can vote using: \`/vote election_id:${election.id}\``,
        embeds: [],
        components: []
    });
}

async function createElectionEmbed(election) {
    const embed = new EmbedBuilder()
        .setTitle(`${election.emoji} ${election.title}`)
        .setDescription(election.description)
        .setColor(0x00ff00)
        .setTimestamp()
        .setAuthor({
            name: "Chatmandu Election Bot",
            iconURL: "https://cdn.discordapp.com/avatars/1176121220614340668/4c136772e68b63aa9452998f63eb635e.png?size=4096"
        })
        .setFooter({
            text: "discord.gg/chatmandu",
            iconURL: "https://cdn.discordapp.com/avatars/1176121220614340668/4c136772e68b63aa9452998f63eb635e.png?size=4096"
        });

    const optionVoters = {};
    voteLog.forEach(vote => {
        if (vote.electionId === election.id) {
            if (!optionVoters[vote.optionId]) {
                optionVoters[vote.optionId] = [];
            }
            optionVoters[vote.optionId].push(vote.userId);
        }
    });

    for (let i = 0; i < election.options.length; i++) {
        const option = election.options[i];
        const voters = optionVoters[option.id] || [];
        
        let voterNames = [];
        for (const userId of voters) {
            try {
                const user = await client.users.fetch(userId);
                voterNames.push(user.displayName || user.username);
            } catch (error) {
                voterNames.push(`Unknown User (${userId})`);
            }
        }

        const voterList = voterNames.length > 0 ? `\nVoters: ${voterNames.join(', ')}` : '';
        
        embed.addFields({
            name: `${convertEmojiNameToEmoji(option.emoji)} ${option.text}`,
            value: `Votes: ${option.votes}${voterList}`,
            inline: true
        });
    }

    if (process.env.LOGO_URL) {
        embed.setThumbnail(process.env.LOGO_URL);
    }

    return embed;
}

async function updateLiveVoteCounter(electionId) {
    try {
        const election = elections.get(electionId);
        if (!election || !election.publicMessageId || !election.publicChannelId) {
            return;
        }

        const channel = client.channels.cache.get(election.publicChannelId);
        if (!channel) return;

        const message = await channel.messages.fetch(election.publicMessageId);
        if (!message) return;

        const embed = await createElectionEmbed(election);
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`vote_${electionId}`)
            .setPlaceholder('Choose your vote...')
            .addOptions(
                election.options.map(option => {

                    let emoji = convertEmojiNameToEmoji(option.emoji) || '📋';
                    
                    return {
                        label: option.text,
                        value: option.id.toString(),
                        emoji: emoji
                    };
                })
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await message.edit({
            content: `🗳️ **LIVE VOTE COUNTER** - ${election.title}\n*Votes update in real-time as people vote*`,
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Error updating live vote counter:', error);
    }
}

client.once('ready', async () => {
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    loadData();

    try {
        const endedElections = checkAndEndElections();
        for (const electionId of endedElections) {
            console.log(`🏁 Ending election that ended while offline: ${electionId}`);
            await endElection(electionId);
        }
    } catch (error) {
        console.error('Error checking offline elections:', error);
    }
    
    globalCommands = [
        new SlashCommandBuilder()
            .setName('create-election')
            .setDescription('Create a new election')
            .addStringOption(option =>
                option.setName('title')
                    .setDescription('Election title')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('description')
                    .setDescription('Election description')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('options')
                    .setDescription('Options separated by commas')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('duration')
                    .setDescription('Election duration (e.g., 3d, 1w, 24h)')
                    .setRequired(false))
            .addStringOption(option =>
                option.setName('emoji')
                    .setDescription('Election emoji')
                    .setRequired(false)),
        
        new SlashCommandBuilder()
            .setName('vote')
            .setDescription('Vote in an election')
            .addStringOption(option =>
                option.setName('election_id')
                    .setDescription('Election ID to vote in')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('list-elections')
            .setDescription('List all active elections'),
        
        new SlashCommandBuilder()
            .setName('end-chatmandu-election')
            .setDescription('End a Chatmandu election early and show results')
            .addStringOption(option =>
                option.setName('election_id')
                    .setDescription('The ID of the election to end')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('refresh-commands')
            .setDescription('Force refresh slash commands (admin only)')
    ];

    try {
        console.log('🚀 Deploying commands...');
        await client.application.commands.set(globalCommands);
        console.log('✅ Slash commands deployed successfully!');
    } catch (error) {
        console.error('Error deploying commands:', error);
    }

    setInterval(async () => {
        try {
            console.log(`[${new Date().toISOString()}] 🔍 Checking for ended elections...`);
            const endedElections = checkAndEndElections();
            console.log(`Found ${endedElections.length} elections that should end:`, endedElections);
            
            for (const electionId of endedElections) {
                console.log(`🏁 Ending election: ${electionId}`);
                await endElection(electionId);
            }
        } catch (error) {
            console.error('Error checking/ending elections:', error);
        }
    }, 60000); // Check every minute
    
    console.log('⏰ Election monitoring started (checking every minute)');
    console.log('🔧 Setting up election checking interval...');
    console.log('✅ Election checking interval has been set up successfully!');
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        if (commandName === 'create-election') {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const durationStr = interaction.options.getString('duration');
            const emoji = interaction.options.getString('emoji') || '🗳️';
            const optionsText = interaction.options.getString('options');

            const optionsList = optionsText.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
            
            if (optionsList.length < 2) {
                await interaction.reply({ content: '❌ You need at least 2 options for an election.', ephemeral: true });
                return;
            }

            const processedOptions = [];
            for (let i = 0; i < optionsList.length; i++) {
                const optionText = optionsList[i];
                let displayText = optionText;

                const userIdMatch = optionText.match(/<@!?(\d+)>/);
                if (userIdMatch) {
                    try {
                        const userId = userIdMatch[1];
                        const user = await client.users.fetch(userId);
                        displayText = user.displayName || user.username;
                    } catch (error) {
                        displayText = optionText; // Keep original if can't fetch
                    }
                }
                
                processedOptions.push({
                    id: i + 1,
                    text: displayText,
                    originalText: optionText, // Keep original for reference
                    emoji: null, // Will be set after emoji selection
                    votes: 0
                });
            }

            const electionId = generateElectionId();
            const election = {
                id: electionId,
                title,
                description,
                emoji,
                options: processedOptions,
                createdAt: Date.now(),
                active: true,
                publicMessageId: null,
                publicChannelId: null,
                pendingDurationSelection: true,
                pendingEmojiSelection: false,
                creatorId: interaction.user.id
            };

            elections.set(electionId, election);
            saveData();

            await showDurationSelection(interaction, election, durationStr);

        } else if (commandName === 'vote') {
            const electionId = interaction.options.getString('election_id');
            const election = elections.get(electionId);

            if (!election) {
                await interaction.reply({ content: '❌ Election not found.', ephemeral: true });
                return;
            }

            if (!election.active) {
                await interaction.reply({ content: '❌ This election has ended.', ephemeral: true });
                return;
            }

            if (!isAccountOldEnough(interaction.user)) {
                await interaction.reply({ content: '❌ Your account must be at least 6 months old to vote.', ephemeral: true });
                return;
            }

            if (hasUserVoted(interaction.user.id, electionId)) {
                await interaction.reply({ content: '❌ You have already voted in this election.', ephemeral: true });
                return;
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`vote_${electionId}`)
                .setPlaceholder('Choose your vote...')
                .addOptions(
                    election.options.map(option => ({
                        label: option.text,
                        value: option.id.toString(),
                        emoji: option.emoji || '📋'
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                content: `🗳️ **Vote in: ${election.title}**`,
                embeds: [await createElectionEmbed(election)],
                components: [row],
                ephemeral: true
            });

        } else if (commandName === 'list-elections') {
            const activeElections = Array.from(elections.values()).filter(e => e.active);
            
            if (activeElections.length === 0) {
                await interaction.reply({ content: '📋 No active elections found.', ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🗳️ Active Elections')
                .setColor(0x0099ff)
                .setTimestamp();

            activeElections.forEach(election => {
                embed.addFields({
                    name: `${election.emoji} ${election.title}`,
                    value: `ID: \`${election.id}\`\n${election.description}`,
                    inline: false
                });
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (commandName === 'end-chatmandu-election') {
            const electionId = interaction.options.getString('election_id');
            const election = elections.get(electionId);
            
            if (!election) {
                await interaction.reply({ content: '❌ Election not found. Please check the election ID.', ephemeral: true });
                return;
            }
            
            if (election.ended) {
                await interaction.reply({ content: '❌ This election has already ended.', ephemeral: true });
                return;
            }

            const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];
            if (!adminIds.includes(interaction.user.id) && election.creatorId !== interaction.user.id) {
                await interaction.reply({ content: '❌ You do not have permission to end this election.', ephemeral: true });
                return;
            }
            
            await interaction.reply({ content: '🏁 Ending election and calculating results...', ephemeral: true });
            
            try {
                const results = await endElection(electionId);
                await interaction.followUp({ 
                    content: `✅ Election ended successfully!\n\n👑 **Prime Minister:** ${results.primeMinister ? results.primeMinister.text : 'None'}\n🏛️ **Ministers:** ${results.ministers.length} selected\n📊 **Total Votes:** ${results.totalVotes}`, 
                    ephemeral: true 
                });

                try {
                    const primeMinisterLine = results.primeMinister
                        ? `${convertEmojiNameToEmoji(results.primeMinister.emoji)} **${results.primeMinister.text}** - ${results.primeMinister.votes} votes`
                        : 'No votes';
                    const ministersText = results.ministers && results.ministers.length > 0
                        ? results.ministers.map((m, i) => `${i + 1}. ${convertEmojiNameToEmoji(m.emoji)} **${m.text}** - ${m.votes} votes`).join('\n')
                        : 'None';

                    const publicResults = new EmbedBuilder()
                        .setTitle('🏛️ ELECTION RESULTS')
                        .setColor(0x00ff00)
                        .addFields(
                            { name: '👑 PRIME MINISTER', value: primeMinisterLine, inline: false },
                            { name: '🏛️ MINISTERS', value: ministersText, inline: false }
                        )
                        .setTimestamp();

                    await interaction.channel.send({ embeds: [publicResults] });
                } catch (postErr) {
                    console.error('Error posting public results embed:', postErr);
                }
            } catch (error) {
                console.error('Error ending election:', error);
                await interaction.followUp({ content: '❌ Error ending election. Please try again.', ephemeral: true });
            }

        } else if (commandName === 'refresh-commands') {

            const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];
            if (!adminIds.includes(interaction.user.id)) {
                await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
                return;
            }

            await interaction.reply({ content: '🔄 Refreshing commands...', ephemeral: true });
            
            try {
                await client.application.commands.set(globalCommands);
                await interaction.editReply({ content: '✅ Commands refreshed successfully! Please wait a moment for Discord to update.' });
            } catch (error) {
                await interaction.editReply({ content: '❌ Failed to refresh commands.' });
                console.error('Error refreshing commands:', error);
            }
        }

    } catch (error) {
        console.error('Error handling command:', error);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
            }
        } catch (replyError) {
            console.error('Error sending error reply:', replyError);
        }
    }
});

client.on('interactionCreate', async (interaction) => {

    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('duration_modal_')) {
            const electionId = interaction.customId.replace('duration_modal_', '');
            const customDuration = interaction.fields.getTextInputValue('duration_input');
            const election = elections.get(electionId);

            if (!election || !election.pendingDurationSelection) {
                await interaction.reply({ content: '❌ This election setup is no longer active.', ephemeral: true });
                return;
            }

            const durationMs = parseDuration(customDuration);
            election.duration = durationMs;
            election.endTime = Date.now() + durationMs;
            election.pendingDurationSelection = false;
            election.pendingEmojiSelection = true;
            elections.set(electionId, election);
            saveData();

            await interaction.reply({ 
                content: `✅ **Custom duration set to:** ${formatDuration(durationMs)}`, 
                ephemeral: true 
            });

            await showEmojiSelection(interaction, election);
        }
        else if (interaction.customId.startsWith('emoji_modal_')) {
            const parts = interaction.customId.split('_');
            const electionId = parts[2];
            const optionId = parseInt(parts[3]);
            const customEmoji = interaction.fields.getTextInputValue('emoji_input');

            const election = elections.get(electionId);
            if (!election || !election.pendingEmojiSelection) {
                await interaction.reply({ content: '❌ This election setup is no longer active.', ephemeral: true });
                return;
            }

            const option = election.options.find(opt => opt.id === optionId);
            if (!option) {
                await interaction.reply({ content: '❌ Invalid option.', ephemeral: true });
                return;
            }

            option.emoji = convertEmojiNameToEmoji(customEmoji);
            elections.set(electionId, election);
            saveData();

            await interaction.reply({ 
                content: `✅ **Custom emoji set for "${option.text}":** ${option.emoji}`, 
                ephemeral: true 
            });

            const allEmojisSelected = election.options.every(opt => opt.emoji !== null);
            if (allEmojisSelected) {

                await showElectionConfirmation(interaction, election);
            } else {

                await updateEmojiSelectionMessage(interaction, election);
            }
        }
        return;
    }

    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId.startsWith('duration_select_')) {
        const electionId = interaction.customId.replace('duration_select_', '');
        const selectedValue = interaction.values[0];
        const election = elections.get(electionId);

        if (!election || !election.pendingDurationSelection) {
            await interaction.reply({ content: '❌ This election setup is no longer active.', ephemeral: true });
            return;
        }

        if (selectedValue === 'custom') {

            const modal = new ModalBuilder()
                .setCustomId(`duration_modal_${electionId}`)
                .setTitle('Custom Election Duration');

            const durationInput = new TextInputBuilder()
                .setCustomId('duration_input')
                .setLabel('Enter duration (e.g., 2d, 12h, 30m)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Examples: 2d, 12h, 30m, 1w')
                .setRequired(true)
                .setMaxLength(10);

            const actionRow = new ActionRowBuilder().addComponents(durationInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        } else {

            const durationMs = parseDuration(selectedValue);
            election.duration = durationMs;
            election.endTime = Date.now() + durationMs;
            election.pendingDurationSelection = false;
            election.pendingEmojiSelection = true;
            elections.set(electionId, election);
            saveData();

            await interaction.reply({ 
                content: `✅ **Duration set to:** ${formatDuration(durationMs)}`, 
                ephemeral: true 
            });

            await showEmojiSelection(interaction, election);
        }
        return;
    }

    if (interaction.customId.startsWith('confirm_election_')) {
        const electionId = interaction.customId.replace('confirm_election_', '');
        const selectedValue = interaction.values[0];
        const election = elections.get(electionId);

        if (!election || !election.pendingEmojiSelection) {
            await interaction.reply({ content: '❌ This election setup is no longer active.', ephemeral: true });
            return;
        }

        if (selectedValue === 'confirm') {
            await interaction.reply({ 
                content: `✅ **Creating public election message...**`, 
                ephemeral: true 
            });
            await createPublicElectionMessage(interaction, election);
        } else if (selectedValue === 'cancel') {

            elections.delete(electionId);
            saveData();
            await interaction.reply({ 
                content: `❌ **Election cancelled.** The election has been deleted.`, 
                ephemeral: true 
            });
        }
        return;
    }

    if (interaction.customId.startsWith('select_candidate_')) {
        const electionId = interaction.customId.replace('select_candidate_', '');
        const selectedValue = interaction.values[0];
        const election = elections.get(electionId);

        if (!election || !election.pendingEmojiSelection) {
            await interaction.reply({ content: '❌ This election setup is no longer active.', ephemeral: true });
            return;
        }

        if (selectedValue.startsWith('candidate_')) {
            const candidateId = parseInt(selectedValue.replace('candidate_', ''));
            await showEmojiOptionsForCandidate(interaction, election, candidateId);
        }
        return;
    }

    if (interaction.customId.startsWith('emoji_option_')) {
        const parts = interaction.customId.split('_');
        const electionId = parts[2];
        const optionId = parseInt(parts[3]);
        const selectedValue = interaction.values[0];

        const election = elections.get(electionId);
        if (!election || !election.pendingEmojiSelection) {
            await interaction.reply({ content: '❌ This election setup is no longer active.', ephemeral: true });
            return;
        }

        const option = election.options.find(opt => opt.id === optionId);
        if (!option) {
            await interaction.reply({ content: '❌ Invalid option.', ephemeral: true });
            return;
        }

        if (selectedValue.startsWith('default_')) {
            const index = parseInt(selectedValue.split('_')[1]);
            const defaultEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
            option.emoji = defaultEmojis[index] || `${index + 1}.`;
            
            elections.set(electionId, election);
            saveData();

            await interaction.reply({ 
                content: `✅ **Emoji set for "${option.text}":** ${option.emoji}`, 
                ephemeral: true 
            });

            const allEmojisSelected = election.options.every(opt => opt.emoji !== null);
            if (allEmojisSelected) {

                await showElectionConfirmation(interaction, election);
            } else {

                await updateEmojiSelectionMessage(interaction, election);
            }
        }

        else if (selectedValue === 'custom_input') {
            const modal = new ModalBuilder()
                .setCustomId(`emoji_modal_${electionId}_${optionId}`)
                .setTitle(`Custom Emoji for: ${option.text}`);

            const emojiInput = new TextInputBuilder()
                .setCustomId('emoji_input')
                .setLabel('Enter your custom emoji')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Examples: 🎉, :heart:, <:custom_emoji:123456789>, or any Unicode emoji')
                .setRequired(true)
                .setMaxLength(50);

            const actionRow = new ActionRowBuilder().addComponents(emojiInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        }
        return;
    }

    const electionId = interaction.customId.replace('vote_', '');
    const election = elections.get(electionId);

    if (!election || !election.active) {
        await interaction.reply({ content: '❌ This election is no longer active.', ephemeral: true });
        return;
    }

    if (!isAccountOldEnough(interaction.user)) {
        await interaction.reply({ content: '❌ Your account must be at least 6 months old to vote.', ephemeral: true });
        return;
    }

    if (hasUserVoted(interaction.user.id, electionId)) {
        await interaction.reply({ content: '❌ You have already voted in this election.', ephemeral: true });
        return;
    }

    const selectedOptionId = parseInt(interaction.values[0]);
    const option = election.options.find(opt => opt.id === selectedOptionId);

    if (!option) {
        await interaction.reply({ content: '❌ Invalid option selected.', ephemeral: true });
        return;
    }

    option.votes++;
    elections.set(electionId, election);
    
    voteLog.push({
        userId: interaction.user.id,
        electionId,
        optionId: selectedOptionId,
        optionText: option.text,
        timestamp: Date.now()
    });
    
    saveData();

    await updateLiveVoteCounter(electionId);

    const user = interaction.user;
    const displayName = user.displayName || user.username;
    
    await interaction.reply({ 
        content: `✅ **Vote recorded!**\n**${displayName}** voted for: **${option.text}**\n\n*This message will disappear in 10 seconds.*`, 
        ephemeral: true 
    });

    setTimeout(() => {
        interaction.deleteReply().catch(console.error);
    }, 10000);
});

client.login(process.env.token);
