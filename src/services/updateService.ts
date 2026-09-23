export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseName: string;
  releaseNotes: string;
  downloadUrl: string;
  publishedAt: string;
}

// Сравнение версий вида 1.0.2 > 1.0.1
export const isNewerVersion = (latest: string, current: string): boolean => {
  const cleanLatest = latest.replace(/^v/i, '').trim();
  const cleanCurrent = current.replace(/^v/i, '').trim();

  const lParts = cleanLatest.split('.').map((p) => parseInt(p, 10) || 0);
  const cParts = cleanCurrent.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(lParts.length, cParts.length);
  for (let i = 0; i < len; i++) {
    const l = lParts[i] || 0;
    const c = cParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
};

// Проверка наличия релизов в GitHub
export const checkGitHubUpdate = async (
  currentVersion: string = '1.0.1',
  repoSlug: string = 'aevoroo/SNotes'
): Promise<UpdateInfo> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${repoSlug}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'SNotes-App',
      },
    });

    if (!response.ok) {
      return {
        hasUpdate: false,
        latestVersion: currentVersion,
        currentVersion,
        releaseName: '',
        releaseNotes: '',
        downloadUrl: '',
        publishedAt: '',
      };
    }

    const data = await response.json();
    const latestTag = data.tag_name || '';
    const cleanLatest = latestTag.replace(/^v/i, '');
    const hasUpdate = isNewerVersion(cleanLatest, currentVersion);

    // Ищем APK файл в прикрепленных ассетах релиза
    let apkUrl = data.html_url;
    if (Array.isArray(data.assets) && data.assets.length > 0) {
      const apkAsset = data.assets.find((asset: any) =>
        asset.name && asset.name.toLowerCase().endsWith('.apk')
      );
      if (apkAsset && apkAsset.browser_download_url) {
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
      publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString('ru-RU') : '',
    };
  } catch (error) {
    console.error('Ошибка проверки обновлений GitHub:', error);
    return {
      hasUpdate: false,
      latestVersion: currentVersion,
      currentVersion,
      releaseName: '',
      releaseNotes: '',
      downloadUrl: '',
      publishedAt: '',
    };
  }
};
