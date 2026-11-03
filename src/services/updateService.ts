import Constants from 'expo-constants';

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseName: string;
  releaseNotes: string;
  downloadUrl: string;
  publishedAt: string;
  error?: string;
}

export const APP_VERSION = '2.0.2';

export const getInstalledAppVersion = (): string => {
  return APP_VERSION;
};

export const isNewerVersion = (latest: string, current: string): boolean => {
  const sanitize = (ver: string) => ver.replace(/^v/i, '').trim();
  const lParts = sanitize(latest).split('.').map((p) => parseInt(p, 10) || 0);
  const cParts = sanitize(current).split('.').map((p) => parseInt(p, 10) || 0);

  const length = Math.max(lParts.length, cParts.length);
  for (let i = 0; i < length; i++) {
    const l = lParts[i] || 0;
    const c = cParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
};

export const checkGitHubUpdate = async (
  currentVersion: string = getInstalledAppVersion(),
  repoSlug: string = 'aevoro/SNotes',
  timeoutMs: number = 8000
): Promise<UpdateInfo> => {
  const fallbackInfo: UpdateInfo = {
    hasUpdate: false,
    latestVersion: currentVersion,
    currentVersion,
    releaseName: '',
    releaseNotes: '',
    downloadUrl: '',
    publishedAt: '',
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://api.github.com/repos/${repoSlug}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'SNotes-App',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 404) {
      return { ...fallbackInfo, error: 'Релизы в репозитории не найдены' };
    }

    if (response.status === 403) {
      return { ...fallbackInfo, error: 'Превышен лимит запросов к GitHub API' };
    }

    if (!response.ok) {
      return { ...fallbackInfo, error: `Ошибка GitHub API: ${response.status}` };
    }

    const data = await response.json();
    const latestTag = data.tag_name || '';
    const cleanLatest = latestTag.replace(/^v/i, '').trim();
    const hasUpdate = isNewerVersion(cleanLatest, currentVersion);

    let apkUrl = data.html_url || '';
    if (Array.isArray(data.assets) && data.assets.length > 0) {
      const apkAsset = data.assets.find(
        (asset: { name?: string; browser_download_url?: string }) =>
          typeof asset.name === 'string' && asset.name.toLowerCase().endsWith('.apk')
      );
      if (apkAsset?.browser_download_url) {
        apkUrl = apkAsset.browser_download_url;
      }
    }

    return {
      hasUpdate,
      latestVersion: cleanLatest,
      currentVersion,
      releaseName: data.name || latestTag,
      releaseNotes: data.body || '',
      downloadUrl: apkUrl,
      publishedAt: data.published_at
        ? new Date(data.published_at).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '',
    };
  } catch (error: any) {
    clearTimeout(timer);
    const isAbort = error?.name === 'AbortError';
    return {
      ...fallbackInfo,
      error: isAbort ? 'Превышено время ожидания ответа GitHub' : 'Нет подключения к сети',
    };
  }
};
