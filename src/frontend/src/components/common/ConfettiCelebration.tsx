import { useEffect } from "react";
// @ts-expect-error - canvas-confetti doesn't have types
import confetti from "canvas-confetti";

interface ConfettiCelebrationProps {
  trigger: boolean;
}

export default function ConfettiCelebration({
  trigger,
}: ConfettiCelebrationProps) {
  useEffect(() => {
    if (!trigger) return;

    const hasSeenConfetti = localStorage.getItem(
      "srv_first_booking_confetti_shown",
    );
    if (hasSeenConfetti) return;

    // Mark as shown
    localStorage.setItem("srv_first_booking_confetti_shown", "true");

    // Fire confetti
    const duration = 3 * 1000;

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const fireConfetti = () => {
      confetti({
        particleCount: randomInRange(50, 100),
        spread: randomInRange(60, 100),
        origin: { y: randomInRange(0.5, 0.7) },
        colors: [
          "#4F46E5", // indigo-600
          "#22C55E", // green-500
          "#EAB308", // yellow-500
          "#F97316", // orange-500
          "#EC4899", // pink-500
        ],
      });
    };

    const interval = setInterval(fireConfetti, 250);

    setTimeout(() => {
      clearInterval(interval);
    }, duration);

    // Final big burst
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#4F46E5", "#22C55E", "#EAB308"],
      });
    }, duration - 500);
  }, [trigger]);

  return null;
}
