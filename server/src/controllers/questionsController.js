import { QueryTypes } from 'sequelize';
import {
  Answer,
  Points,
  Streak,
  Question,
  Alternative,
  QuestionSession,
  Student,
  Vestibular,
} from '../db/models/index.js';
import sequelize from '../db/index.js';
import { getRequestLogger } from '../services/logger.js';


// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const QUESTION_SELECT = `
  SELECT
    q.id,
    q.statement,
    q.image_url,
    q.year,
    q.difficulty,
    q.topic_id,
    s.id   AS subject_id,
    s.name AS subject,
    v.id   AS vestibular_id,
    v.name AS vestibular,
    (
      SELECT a2.letter
      FROM alternatives a2
      WHERE a2.question_id = q.id AND a2.is_correct = true
      LIMIT 1
    ) AS "correctAlternative",
    json_agg(
      json_build_object(
        'id',        a.id,
        'letter',    a.letter,
        'text',      a.text,
        'image_url', a.image_url,
        'is_correct', a.is_correct
      ) ORDER BY a.letter
    ) AS alternatives
  FROM questions q
  LEFT JOIN alternatives a ON a.question_id = q.id
  LEFT JOIN topics t ON t.id = q.topic_id
  LEFT JOIN subjects s ON s.id = COALESCE(t.subject_id, q.subject_id)
  LEFT JOIN question_vestibulares qv2 ON qv2.question_id = q.id
  LEFT JOIN vestibulares v ON v.id = qv2.vestibular_id
`;

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Endpoints Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export const getAll = async (req, res) => {
  try {
    const { subject_id, vestibular_id, year, difficulty, with_image, limit = 20, offset = 0 } = req.query;

    const conditions = [];
    const replacements = { limit: parseInt(limit), offset: parseInt(offset) };

    if (subject_id) {
      conditions.push(`s.id = :subject_id`);
      replacements.subject_id = parseInt(subject_id);
    }

    if (vestibular_id) {
      conditions.push(`qv2.vestibular_id = :vestibular_id`);
      replacements.vestibular_id = parseInt(vestibular_id);
    }

    if (year) {
      conditions.push(`q.year = :year`);
      replacements.year = parseInt(year);
    }

    if (difficulty) {
      conditions.push(`q.difficulty = :difficulty`);
      replacements.difficulty = difficulty;
    }

    if (with_image === '1') {
      conditions.push(`q.image_url IS NOT NULL AND q.image_url <> ''`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [questions, countRows] = await Promise.all([
      sequelize.query(
        `${QUESTION_SELECT} ${where} GROUP BY q.id, q.statement, q.image_url, q.year, q.difficulty, q.topic_id, s.id, s.name, v.id, v.name ORDER BY RANDOM() LIMIT :limit OFFSET :offset`,
        { replacements, type: QueryTypes.SELECT },
      ),
      sequelize.query(
        `SELECT COUNT(DISTINCT q.id) AS count
         FROM questions q
         LEFT JOIN topics t ON t.id = q.topic_id
         LEFT JOIN subjects s ON s.id = COALESCE(t.subject_id, q.subject_id)
         LEFT JOIN question_vestibulares qv2 ON qv2.question_id = q.id
         LEFT JOIN vestibulares v ON v.id = qv2.vestibular_id
         ${where}`,
        { replacements, type: QueryTypes.SELECT },
      ),
    ]);

    return res.json({
      message: 'Questions fetched',
      data: { count: parseInt(countRows[0].count), rows: questions },
    });
  } catch (error) {
    getRequestLogger(req).error({ err: error, event: 'questions_get_all_error' }, 'getAll questions error');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const [question] = await sequelize.query(
      `${QUESTION_SELECT} WHERE q.id = :id GROUP BY q.id, s.id, s.name, v.id, v.name`,
      { replacements: { id: parseInt(id) }, type: QueryTypes.SELECT },
    );
    if (!question) return res.status(404).json({ message: 'Question not found' });
    return res.json({ message: 'Question fetched', data: question });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT id, name FROM subjects ORDER BY id`,
      { type: QueryTypes.SELECT },
    );
    return res.json({ message: 'Subjects fetched', data: rows });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTopics = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT t.id, t.name, t.subject_id, s.name AS subject_name
       FROM topics t
       JOIN subjects s ON s.id = t.subject_id
       ORDER BY s.name, t.name`,
      { type: QueryTypes.SELECT },
    );
    return res.json({ message: 'Topics fetched', data: rows });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getVestibulares = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT id, name, full_name FROM vestibulares ORDER BY name`,
      { type: QueryTypes.SELECT },
    );
    return res.json({ message: 'Vestibulares fetched', data: rows });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getYears = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT DISTINCT year FROM questions WHERE bank = 'ENEM' AND year IS NOT NULL ORDER BY year DESC`,
      { type: QueryTypes.SELECT },
    );
    return res.json({ message: 'Years fetched', data: rows.map(r => r.year) });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Answer submission Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export const submitAnswer = async (req, res) => {
  try {
    const { session_id, question_id, chosen_alternative_id, response_time_seconds } = req.body;
    const student_id = req.user.id;

    const sessionId = Number.parseInt(session_id, 10);
    const questionId = Number.parseInt(question_id, 10);
    const chosenAlternativeId = Number.parseInt(chosen_alternative_id, 10);
    const responseTimeSeconds = response_time_seconds === undefined || response_time_seconds === null
      ? null
      : Number.parseInt(response_time_seconds, 10);

    if (!Number.isInteger(sessionId) || !Number.isInteger(questionId) || !Number.isInteger(chosenAlternativeId)) {
      return res.status(400).json({ message: 'session_id, question_id e chosen_alternative_id sao obrigatorios e devem ser numeros inteiros.' });
    }

    if (
      response_time_seconds !== undefined
      && response_time_seconds !== null
      && !Number.isInteger(responseTimeSeconds)
    ) {
      return res.status(400).json({ message: 'response_time_seconds deve ser um numero inteiro.' });
    }

    const t = await sequelize.transaction();

    try {
      const session = await QuestionSession.findOne({
        where: { id: sessionId, student_id },
        transaction: t,
      });

      if (!session) {
        await t.rollback();
        return res.status(403).json({ message: 'Sessao invalida para este usuario.' });
      }

      const alternative = await Alternative.findOne({
        where: { id: chosenAlternativeId, question_id: questionId },
        attributes: ['id', 'is_correct'],
        transaction: t,
      });

      if (!alternative) {
        await t.rollback();
        return res.status(400).json({ message: 'Alternativa invalida para a questao informada.' });
      }

      const is_correct = Boolean(alternative.is_correct);

      const answer = await Answer.create({
        session_id: sessionId,
        question_id: questionId,
        chosen_alternative_id: chosenAlternativeId,
        is_correct,
        student_id,
        response_time_seconds: responseTimeSeconds,
      }, { transaction: t });

      if (is_correct) {
        await Points.create({ student_id, amount: 10, reason: 'correct_answer' }, { transaction: t });
      }

      const today = new Date().toISOString().slice(0, 10);
      const streak = await Streak.findOne({ where: { student_id }, transaction: t });

      if (!streak) {
        await Streak.create(
          { student_id, current_streak: 1, longest_streak: 1, last_activity_date: today },
          { transaction: t },
        );
      } else if (streak.last_activity_date !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const new_streak = streak.last_activity_date === yesterday ? streak.current_streak + 1 : 1;
        await streak.update({
          current_streak: new_streak,
          longest_streak: Math.max(new_streak, streak.longest_streak),
          last_activity_date: today,
        }, { transaction: t });
      }

      await t.commit();
      return res.json({ message: 'Answer submitted', data: { answer, is_correct } });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const startPracticeSession = async (req, res) => {
  try {
    const session = await QuestionSession.create({
      student_id: req.user.id,
      simulation_id: null,
      mode: 'practice',
    });
    return res.status(201).json({ message: 'Session started', data: session });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const setTargetVestibular = async (req, res) => {
  try {
    const { vestibular_id } = req.body;

    if (req.user?.type !== 'student') {
      return res.status(403).json({ message: 'Apenas estudantes podem definir vestibular alvo.' });
    }

    let targetVestibularId = null;
    if (vestibular_id !== null && vestibular_id !== undefined && vestibular_id !== '') {
      targetVestibularId = Number.parseInt(vestibular_id, 10);
      if (!Number.isInteger(targetVestibularId) || targetVestibularId <= 0) {
        return res.status(400).json({ message: 'vestibular_id deve ser um numero inteiro valido ou null.' });
      }

      const vestibular = await Vestibular.findByPk(targetVestibularId);
      if (!vestibular) {
        return res.status(404).json({ message: 'Vestibular nao encontrado.' });
      }
    }

    const student = await Student.findByPk(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Estudante nao encontrado.' });
    }

    await student.update({ target_vestibular_id: targetVestibularId });

    return res.json({
      message: 'Target vestibular updated',
      data: { target_vestibular_id: targetVestibularId },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Teacher CRUD Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export const createQuestion = async (req, res) => {
  try {
    const { statement, image_url, topic_id, difficulty, source, year, bank, alternatives } = req.body;

    if (!statement || !topic_id || !difficulty || !Array.isArray(alternatives) || alternatives.length < 2) {
      return res.status(400).json({ message: 'Campos obrigatÃƒÂ³rios: statement, topic_id, difficulty, alternatives' });
    }

    const t = await sequelize.transaction();
    try {
      const question = await Question.create(
        { statement, topic_id, difficulty, source: source || null, year: year || null, bank: bank || null, created_by: req.user.id },
        { transaction: t, fields: ['statement', 'topic_id', 'difficulty', 'source', 'year', 'bank', 'created_by'] }
      );

      if (image_url) {
        await sequelize.query(
          `UPDATE questions SET image_url = :image_url WHERE id = :id`,
          { replacements: { image_url, id: question.id }, transaction: t, type: QueryTypes.UPDATE }
        );
      }

      const letters = ['A', 'B', 'C', 'D', 'E'];
      await Alternative.bulkCreate(
        alternatives.map((a, i) => ({
          question_id: question.id,
          letter: a.letter || letters[i],
          text: a.text,
          is_correct: a.is_correct || false,
        })),
        { transaction: t, fields: ['question_id', 'letter', 'text', 'is_correct'] }
      );

      // save alternative image_urls via raw query (column not in model)
      for (const a of alternatives) {
        if (a.image_url) {
          const letter = a.letter || letters[alternatives.indexOf(a)];
          await sequelize.query(
            `UPDATE alternatives SET image_url = :image_url WHERE question_id = :qid AND letter = :letter`,
            { replacements: { image_url: a.image_url, qid: question.id, letter }, transaction: t, type: QueryTypes.UPDATE }
          );
        }
      }

      await t.commit();
      return res.status(201).json({ message: 'Question created', data: question });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { statement, image_url, topic_id, difficulty, source, year, bank, alternatives } = req.body;

    const question = await Question.findByPk(id);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    await question.update({
      statement:  statement  ?? question.statement,
      topic_id:   topic_id   ?? question.topic_id,
      difficulty: difficulty ?? question.difficulty,
      source:     source     !== undefined ? source || null  : question.source,
      year:       year       !== undefined ? year   || null  : question.year,
      bank:       bank       !== undefined ? bank   || null  : question.bank,
    });

    if (image_url !== undefined) {
      await sequelize.query(
        `UPDATE questions SET image_url = :image_url WHERE id = :id`,
        { replacements: { image_url: image_url || null, id }, type: QueryTypes.UPDATE }
      );
    }

    if (Array.isArray(alternatives)) {
      for (const a of alternatives) {
        if (a.id) {
          await sequelize.query(
            `UPDATE alternatives SET text = :text, image_url = :image_url WHERE id = :id`,
            { replacements: { text: a.text, image_url: a.image_url || null, id: a.id }, type: QueryTypes.UPDATE }
          );
        }
      }
    }

    return res.json({ message: 'Question updated', data: question });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findByPk(id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    await question.destroy();
    return res.json({ message: 'Question deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

