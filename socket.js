const { io } = require('./server');

function emitBalanceUpdate(userId, accountId, newBalance) {
  io.to(userId.toString()).emit('balanceUpdate', {
    accountId,
    newBalance
  });
}


module.exports = { emitBalanceUpdate };
