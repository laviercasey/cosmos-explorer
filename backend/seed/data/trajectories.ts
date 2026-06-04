
import type { Trajectory } from './types';

const MISSION_TRAJECTORIES: Readonly<Record<string, Trajectory>> = {
  'Artemis 2': {
    missionName: 'Artemis 2',
    agency: 'NASA',
    year: 2026,
    duration: '9 days 1 hour',
    durationRu: '9 суток 1 час',
    crew: ['Reid Wiseman', 'Victor Glover', 'Christina Koch', 'Jeremy Hansen'],

    moonPos: [5.5, 0, 2.0],

    moonOrbitArc: 2.08,

    waypoints: [

      [ 0,     0.1,   1.1],
      [ 1.0,   0.1,   0.5],
      [ 0.7,   0.12, -0.8],
      [-0.5,   0.15, -0.95],
      [-1.0,   0.18,  0.4],
      [-0.3,   0.2,   1.05],

      [ 0.8,   0.4,   1.8],
      [ 1.8,   0.6,   2.5],

      [ 3.0,   0.6,   3.2],
      [ 4.2,   0.4,   3.5],

      [ 5.3,   0.2,   3.0],
      [ 5.9,   0.1,   2.8],
      [ 6.2,   0,     2.1],
      [ 5.8,  -0.15,  1.2],

      [ 4.6,  -0.35,  0.3],
      [ 3.0,  -0.5,  -0.2],
      [ 1.6,  -0.3,   0.2],

      [ 0.6,  -0.1,   0.6],
      [ 0,     0,     0.9],
    ],

    simDuration: 60,

    phases: [
      {
        id: 'leo',
        label: 'Launch & Earth Orbit',
        labelRu: 'Запуск и орбита Земли',
        t: [0.00, 0.26],
        description:
          'SLS generates 8.8 million lbf of thrust and places Orion ' +
          'into a 200 km Low Earth Orbit. The crew — commander Reid Wiseman, ' +
          'pilot Victor Glover, mission specialists Christina Koch and ' +
          'Jeremy Hansen — complete a full orbit verifying all systems.',
        descriptionRu:
          'SLS развивает тягу 39 МН и выводит «Орион» на орбиту 200 км. ' +
          'Экипаж — командир Рид Уайзман, пилот Виктор Гловер, ' +
          'специалисты Кристина Кох и Джереми Хансен (CSA) — ' +
          'совершает виток, проверяя все системы.',
      },
      {
        id: 'tli',
        label: 'Trans-Lunar Injection',
        labelRu: 'Разгон к Луне',
        t: [0.26, 0.37],
        description:
          'The European Service Module\'s AJ10 engine fires for 5 minutes ' +
          '49 seconds, accelerating Orion to 39 472 km/h — enough to ' +
          'escape Earth orbit and coast toward the Moon.',
        descriptionRu:
          'Двигатель AJ10 европейского сервисного модуля работает 5 минут ' +
          '49 секунд, разгоняя «Орион» до 39 472 км/ч — достаточно, ' +
          'чтобы покинуть орбиту Земли и лететь к Луне.',
      },
      {
        id: 'coast_out',
        label: 'Outbound Coast',
        labelRu: 'Полёт к Луне',
        t: [0.37, 0.50],
        description:
          'Orion coasts toward the Moon for ~4 days without engine burns. ' +
          'The crew tests life-support, navigation and deep-space ' +
          'communications at increasing distance from Earth.',
        descriptionRu:
          'Около 4 суток «Орион» летит к Луне по инерции. ' +
          'Экипаж тестирует жизнеобеспечение, навигацию и дальнюю связь ' +
          'на растущем удалении от Земли.',
      },
      {
        id: 'lunar_flyby',
        label: 'Lunar Flyby',
        labelRu: 'Облёт Луны',
        t: [0.50, 0.70],
        description:
          'Orion swings behind the far side of the Moon at 6 545 km ' +
          'altitude. The crew reaches 406 771 km from Earth — a new ' +
          'record, surpassing Apollo 13. Lunar gravity bends the ' +
          'trajectory homeward.',
        descriptionRu:
          '«Орион» огибает обратную сторону Луны на высоте 6 545 км. ' +
          'Экипаж удаляется на 406 771 км от Земли — новый рекорд, ' +
          'превышающий «Аполлон-13». Гравитация Луны разворачивает корабль.',
      },
      {
        id: 'coast_return',
        label: 'Return Coast',
        labelRu: 'Возвращение',
        t: [0.70, 0.90],
        description:
          'The free-return trajectory carries Orion back toward Earth ' +
          'over several days. No engine burn is required — the lunar ' +
          'gravity assist set the homeward course.',
        descriptionRu:
          'Траектория свободного возврата несёт «Орион» к Земле. ' +
          'Двигатели не нужны — гравитационный манёвр у Луны ' +
          'обеспечил верный курс домой.',
      },
      {
        id: 'reentry',
        label: 'Re-entry & Splashdown',
        labelRu: 'Вход в атмосферу и посадка',
        t: [0.90, 1.00],
        description:
          'Orion hits the atmosphere at ~40 000 km/h. ' +
          'The heat shield endures 2 760 °C. Parachutes deploy ' +
          'and the capsule splashes down in the Pacific Ocean. ' +
          'Total mission time: 9 days 1 hour.',
        descriptionRu:
          '«Орион» входит в атмосферу на скорости ~40 000 км/ч. ' +
          'Тепловой щит выдерживает 2 760 °C. Парашюты раскрываются, ' +
          'капсула приводняется в Тихом океане. ' +
          'Общее время миссии: 9 суток 1 час.',
      },
    ],
  },
};

export default MISSION_TRAJECTORIES;
