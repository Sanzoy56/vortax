// ========== COMMANDE /adminmoneyajouter ==========
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'adminmoneyajouter') return;

    const cible = interaction.options.getUser('membre');
    const somme = interaction.options.getInteger('somme');

    await withUserLock(cible.id, async () => {
      const db   = getDB();
      const user = getUser(db, cible.id);
      user.coins += somme;
      saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('VTX-Coins ajoutes [ADMIN]')
        .setColor(0xe67e22)
        .setDescription(
          `**+${somme.toLocaleString()} VTX-Coins** ajoutes a <@${cible.id}>\n\n` +
          `Solde actuel : **${user.coins.toLocaleString()} VTX-Coins**`
        )
        .setFooter({ text: `Action effectuee par ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    });
  });
  // ========== COMMANDE /adminmoneyremove ==========
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName !== 'adminmoneyremove') return;
  
      const cible = interaction.options.getUser('membre');
      const somme = interaction.options.getInteger('somme');
  
      await withUserLock(cible.id, async () => {
        const db   = getDB();
        const user = getUser(db, cible.id);
        user.coins = Math.max(0, (user.coins || 0) - somme);
        saveDB(db);
  
        const embed = new EmbedBuilder()
          .setTitle('VTX-Coins retires [ADMIN]')
          .setColor(0xe74c3c)
          .setDescription(
            `**-${somme.toLocaleString()} VTX-Coins** retires a <@${cible.id}>\n\n` +
            `Solde actuel : **${user.coins.toLocaleString()} VTX-Coins**`
          )
          .setFooter({ text: `Action effectuee par ${interaction.user.username}` })
          .setTimestamp();
  
        await interaction.reply({ embeds: [embed], ephemeral: true });
      });
    });
    // ========== COMMANDE /adminexpajouter ==========
      client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== 'adminexpajouter') return;
    
        const cible = interaction.options.getUser('membre');
        const somme = interaction.options.getInteger('somme');
    
        await withUserLock(cible.id, async () => {
          const db   = getDB();
          const user = getUser(db, cible.id);
    
          // FIX NIVEAU : snapshot avant modification
          const ancienNiveau = user.niveau;
          user.xp += somme;
    
          const membre = await interaction.guild.members.fetch(cible.id).catch(() => null);
          await gererNiveauEtRang(user, ancienNiveau, interaction.guild, membre, cible.id);
          saveDB(db);
    
          const embed = new EmbedBuilder()
            .setTitle('XP ajoutee [ADMIN]')
            .setColor(0xe67e22)
            .setDescription(
              `**+${somme.toLocaleString()} XP** ajoutes a <@${cible.id}>\n\n` +
              `Niveau : **${user.niveau}**\n` +
              `XP actuelle : **${user.xp}** / **${xpPourNiveau(user.niveau)}**`
            )
            .setFooter({ text: `Action effectuee par ${interaction.user.username}` })
            .setTimestamp();
    
          await interaction.reply({ embeds: [embed], ephemeral: true });
        });
      });
       // ========== COMMANDE /adminexpremove ==========
        client.on('interactionCreate', async (interaction) => {
          if (!interaction.isChatInputCommand()) return;
          if (interaction.commandName !== 'adminexpremove') return;
      
          const cible = interaction.options.getUser('membre');
          const somme = interaction.options.getInteger('somme');
      
          await withUserLock(cible.id, async () => {
            const db   = getDB();
            const user = getUser(db, cible.id);
      
            // FIX NIVEAU : snapshot avant modification
            const ancienNiveau = user.niveau;
            user.xp = Math.max(0, (user.xp || 0) - somme);
      
            const membre = await interaction.guild.members.fetch(cible.id).catch(() => null);
            await gererNiveauEtRang(user, ancienNiveau, interaction.guild, membre, cible.id);
            saveDB(db);
      
            const embed = new EmbedBuilder()
              .setTitle('XP retiree [ADMIN]')
              .setColor(0xe74c3c)
              .setDescription(
                `**-${somme.toLocaleString()} XP** retires a <@${cible.id}>\n\n` +
                `Niveau : **${user.niveau}**\n` +
                `XP actuelle : **${user.xp}** / **${xpPourNiveau(user.niveau)}**`
              )
              .setFooter({ text: `Action effectuee par ${interaction.user.username}` })
              .setTimestamp();
      
            await interaction.reply({ embeds: [embed], ephemeral: true });
          });
        });