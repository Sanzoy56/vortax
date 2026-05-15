module.exports = (client) => {
  client.on('guildMemberAdd', async (member) => {
    const roleIds = [
      '1473432273239146679',
      '1473430632083492894',
      '1500261190121554020',
      '1473433947286405231',
      '1473433336335565064',
      '1473434324866175171',
      '1362730545695559840',
    ];

    for (const roleId of roleIds) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) await member.roles.add(role).catch(() => {});
    }
  });
};