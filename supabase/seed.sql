-- Preset exercise library. user_id is null, so every account sees these.
--
-- Scoped to movements people actually log: no warm-up variants, no
-- competition-lift minutiae. Re-runnable thanks to exercises_preset_name_idx.

insert into exercises (name, muscle_group, equipment, is_bodyweight) values
  -- Chest
  ('Bench Press',              'Chest',     'Barbell',    false),
  ('Incline Bench Press',      'Chest',     'Barbell',    false),
  ('Dumbbell Bench Press',     'Chest',     'Dumbbell',   false),
  ('Incline Dumbbell Press',   'Chest',     'Dumbbell',   false),
  ('Chest Fly',                'Chest',     'Cable',      false),
  ('Chest Press',              'Chest',     'Machine',    false),
  ('Push-Up',                  'Chest',     'Bodyweight', true),
  ('Dip',                      'Chest',     'Bodyweight', true),

  -- Back
  ('Deadlift',                 'Back',      'Barbell',    false),
  ('Romanian Deadlift',        'Back',      'Barbell',    false),
  ('Barbell Row',              'Back',      'Barbell',    false),
  ('Dumbbell Row',             'Back',      'Dumbbell',   false),
  ('Seated Cable Row',         'Back',      'Cable',      false),
  ('Lat Pulldown',             'Back',      'Cable',      false),
  ('Straight-Arm Pulldown',    'Back',      'Cable',      false),
  ('Pull-Up',                  'Back',      'Bodyweight', true),
  ('Chin-Up',                  'Back',      'Bodyweight', true),
  ('Face Pull',                'Back',      'Cable',      false),
  ('Shrug',                    'Back',      'Dumbbell',   false),

  -- Legs
  ('Back Squat',               'Legs',      'Barbell',    false),
  ('Front Squat',              'Legs',      'Barbell',    false),
  ('Goblet Squat',             'Legs',      'Dumbbell',   false),
  ('Leg Press',                'Legs',      'Machine',    false),
  ('Bulgarian Split Squat',    'Legs',      'Dumbbell',   false),
  ('Walking Lunge',            'Legs',      'Dumbbell',   false),
  ('Leg Extension',            'Legs',      'Machine',    false),
  ('Leg Curl',                 'Legs',      'Machine',    false),
  ('Hip Thrust',               'Legs',      'Barbell',    false),
  ('Calf Raise',               'Legs',      'Machine',    false),
  ('Step-Up',                  'Legs',      'Dumbbell',   false),
  ('Bodyweight Squat',         'Legs',      'Bodyweight', true),

  -- Shoulders
  ('Overhead Press',           'Shoulders', 'Barbell',    false),
  ('Dumbbell Shoulder Press',  'Shoulders', 'Dumbbell',   false),
  ('Arnold Press',             'Shoulders', 'Dumbbell',   false),
  ('Lateral Raise',            'Shoulders', 'Dumbbell',   false),
  ('Cable Lateral Raise',      'Shoulders', 'Cable',      false),
  ('Rear Delt Fly',            'Shoulders', 'Dumbbell',   false),
  ('Upright Row',              'Shoulders', 'Barbell',    false),

  -- Arms
  ('Barbell Curl',             'Arms',      'Barbell',    false),
  ('Dumbbell Curl',            'Arms',      'Dumbbell',   false),
  ('Hammer Curl',              'Arms',      'Dumbbell',   false),
  ('Preacher Curl',            'Arms',      'Machine',    false),
  ('Cable Curl',               'Arms',      'Cable',      false),
  ('Tricep Pushdown',          'Arms',      'Cable',      false),
  ('Overhead Tricep Extension','Arms',      'Dumbbell',   false),
  ('Skull Crusher',            'Arms',      'Barbell',    false),
  ('Close-Grip Bench Press',   'Arms',      'Barbell',    false),

  -- Core
  ('Plank',                    'Core',      'Bodyweight', true),
  ('Hanging Leg Raise',        'Core',      'Bodyweight', true),
  ('Cable Crunch',             'Core',      'Cable',      false),
  ('Ab Wheel Rollout',         'Core',      'Bodyweight', true),
  ('Russian Twist',            'Core',      'Dumbbell',   false),
  ('Back Extension',           'Core',      'Bodyweight', true),

  -- Carries and everyday movement
  ('Farmer''s Carry',          'Full Body', 'Dumbbell',   false),
  ('Kettlebell Swing',         'Full Body', 'Kettlebell', false)
on conflict (name) where user_id is null do nothing;
