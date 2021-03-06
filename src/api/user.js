const bcrypt = require('bcrypt-nodejs');
const { user } = require('pg/lib/defaults');

module.exports = app => {
    const { existsOrError, notExistsOrError, equalsOrError } = app.src.api.validation;

    const encryptPassword = password => {
        const salt = bcrypt.genSaltSync(10);
        return bcrypt.hashSync(password, salt);
    };

    const save = async (req, res) => {
        const user = { ...req.body };

        if (req.params.id) {
            user.id = req.params.id;
        }

        try {
            existsOrError(user.nome, 'Nome não informado');
            existsOrError(user.email, 'E-mail não informado');
            existsOrError(user.password, 'Senha não infromada');
            existsOrError(user.confirmPassword, 'Confirmação de senha inválida');
            equalsOrError(user.password, user.confirmPassword, 'As senhas informadas não conferem');

            const userFromDb = await app.db('usuarios')
                .where({ email: user.email })
                .first();

            if (!user.id) {
                notExistsOrError(userFromDb, 'Usuário já cadastrado');
            }
        } catch (e) {
            return res.status(400).send(e);
        }

        user.password = encryptPassword(user.password);
        delete user.confirmPassword;

        if (user.id) {
            app.db('usuarios')
                .update(user)
                .where({ id: user.id })
                .then(_ => res.status(204).send())
                .catch(err => res.status(500).send(err));
        } else {
            app.db('usuarios')
                .insert(user)
                .then(_ => res.status(204).send())
                .catch(err => res.status(500).send(err));
        }
    };

    const get = (req, res) => {
        app.db('usuarios')
            .select('id', 'nome', 'email', 'admin')
            .then(users => res.json(users))
            .catch(err => res.status(500).send(err));
    }

    const getUserById = (req, res) => {
        const idUser = req.params.id;

        app.db('usuarios')
            .select('id', 'nome', 'email', 'admin')
            .where({ id: idUser })
            .first() // Retorna apenas um único resultado.
            .then(user => res.json(user))
            .catch(err => res.status(500).send(err));
    }

    return { save, get, getUserById }
}