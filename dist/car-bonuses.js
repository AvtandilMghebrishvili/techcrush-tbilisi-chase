// Pure shared rules. The server stamps a version on new run tickets, so a
// pre-update run is not retroactively reinterpreted or multiplied twice.
export const isEliteCar = (car) => car === "creator" || car === "batmobile";
export const carRewardMultiplier = (car) =>
  car === "batmobile" ? 3 : car === "creator" ? 2 : 1;
export const carCashMultiplier = (car) =>
  car === "batmobile" ? 5 : car === "creator" ? 2 : 1;
export const ticketRewardMultiplier = (ticket) =>
  ticket?.rewardVersion === 1 ? carRewardMultiplier(ticket.car) : 1;
export const ticketCashMultiplier = (ticket) =>
  ticket?.rewardVersion === 1 ? carCashMultiplier(ticket.car) : 1;
export const policeDamageMultiplier = (car) => (car === "batmobile" ? 1.4 : 1);
export const BAT_PATROL_CASH = 5000;
