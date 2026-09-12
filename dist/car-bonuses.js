// Pure shared rules. The server stamps a version on new run tickets, so a
// pre-update run is not retroactively reinterpreted or multiplied twice.
export const carRewardMultiplier = (car) => (car === "creator" ? 2 : 1);
export const ticketRewardMultiplier = (ticket) =>
  ticket?.rewardVersion === 1 ? carRewardMultiplier(ticket.car) : 1;
