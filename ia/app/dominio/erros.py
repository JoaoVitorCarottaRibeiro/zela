"""Erros do domínio."""


class RegraViolada(Exception):
    """Uma regra de negócio do domínio foi quebrada.

    A API traduz isso em HTTP 422 (ver o handler em app/main.py), mantendo as
    regras no domínio e longe do controller.
    """
