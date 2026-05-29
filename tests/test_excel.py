"""
test_excel.py — Tests para validación de magic bytes en uploads de Excel.
Cubre: _validate_excel_magic en usuarios.py y prestadores.py.
"""
import io

import pytest
from fastapi import HTTPException

from app.routers.usuarios import _validate_excel_magic as usuarios_validate
from app.routers.prestadores import _validate_excel_magic as prestadores_validate


# Magic bytes reales
XLSX_MAGIC = b"PK\x03\x04" + b"\x00" * 4   # ZIP header (OOXML .xlsx)
XLS_MAGIC  = b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1"  # CFBF header (.xls)
INVALID    = b"NOT AN EXCEL FILE HEADER"


class TestUsuariosExcelMagic:
    def test_valid_xlsx(self):
        f = io.BytesIO(XLSX_MAGIC + b"\x00" * 100)
        usuarios_validate(f)  # No debe lanzar

    def test_valid_xls(self):
        f = io.BytesIO(XLS_MAGIC + b"\x00" * 100)
        usuarios_validate(f)  # No debe lanzar

    def test_invalid_file_raises(self):
        f = io.BytesIO(INVALID)
        with pytest.raises(HTTPException) as exc_info:
            usuarios_validate(f)
        assert exc_info.value.status_code == 400

    def test_empty_file_raises(self):
        f = io.BytesIO(b"")
        with pytest.raises(HTTPException):
            usuarios_validate(f)

    def test_seek_resets_to_zero(self):
        """Después de validar, el stream debe estar en posición 0."""
        content = XLSX_MAGIC + b"\x00" * 200
        f = io.BytesIO(content)
        usuarios_validate(f)
        assert f.tell() == 0  # seek(0) fue llamado


class TestPrestadoresExcelMagic:
    def test_valid_xlsx(self):
        f = io.BytesIO(XLSX_MAGIC + b"\x00" * 100)
        prestadores_validate(f)

    def test_invalid_raises(self):
        f = io.BytesIO(b"\xFF\xFF\xFF\xFF invalid")
        with pytest.raises(HTTPException) as exc_info:
            prestadores_validate(f)
        assert exc_info.value.status_code == 400
