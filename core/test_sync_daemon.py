import pytest
from unittest.mock import patch
from sync_daemon import SyncDaemon

@pytest.fixture
def mock_get_profile_free(monkeypatch):
    monkeypatch.setattr("sync_daemon.get_profile", lambda: {"name": "Test Free", "tier": "free", "id": "f1", "telegram_id": ""})

@pytest.fixture
def mock_get_profile_pro(monkeypatch):
    monkeypatch.setattr("sync_daemon.get_profile", lambda: {"name": "Test Pro", "tier": "pro", "id": "p1", "telegram_id": ""})

def test_sync_daemon_free(mock_get_profile_free):
    daemon = SyncDaemon()
    assert daemon.run_backup_cycle() is False
    assert daemon.send_telegram_report("Test") is True

@pytest.fixture
def mock_zipfile(monkeypatch):
    import zipfile
    from unittest.mock import MagicMock
    mock_zip = MagicMock()
    monkeypatch.setattr(zipfile, "ZipFile", mock_zip)
    return mock_zip

@patch("sync_daemon.os.path.getsize", return_value=1024)
@patch("sync_daemon.os.path.exists", return_value=True)
@patch("sync_daemon.os.path.isdir", return_value=True)
@patch("sync_daemon.os.listdir", return_value=["smartcoffeeshop"])
@patch("sync_daemon.os.walk", return_value=[("/fake/workspace", ("subdir",), ("file.txt",))])
def test_sync_daemon_pro(mock_walk, mock_listdir, mock_isdir, mock_exists, mock_getsize, mock_get_profile_pro, mock_zipfile):
    daemon = SyncDaemon()
    assert daemon.run_backup_cycle() is True
    # Verify we actually attempted to create zip files!
    assert mock_zipfile.called
    assert daemon.send_telegram_report("Test") is True
