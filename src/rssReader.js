import axios from 'axios';
import { watch } from 'melanke-watchjs';
import validator from 'validator';
import {
  parseResponse, processData, updateFeedsState, processNews,
} from './processors';
import {
  makeRssFeedElem, moveRssForm, makeNewsList, displayNews,
} from './htmlMakers';

export default () => {
  const appState = {
    links: {
      typedLink: {
        isEmpty: true,
        isValid: false,
      },
      lastValidUrl: '',
      lastAddedUrl: '',
      allAddedUrls: new Set(),
    },
    warning: {
      isExist: false,
      warningMessage: '',
    },
    feeds: {
      lastFeedId: '',
      workableUrls: new Set(),
      rssInfo: {},
      activeFeedId: '',
      prevActiveFeedId: '',
      items: {
        freshNews: {
          currentFeedWithNews: '',
        },
        allNews: {},
        allNewsTitles: new Map(),
      },
    },
    rssFormState: {
      atTheBottom: false,
    },
  };

  const formContainer = document.getElementById('jumbotron');
  const addRssForm = document.getElementById('addRss');
  const [addLinkBtn, inputField, warningNode] = [...addRssForm.children];
  const feedsTag = document.getElementById('rssFeeds');
  const newsTag = document.getElementById('news');
  const rssExample = document.getElementById('rssExample');
  const storyExample = document.getElementById('storyExample');

  const markActive = ({ currentTarget }) => {
    const { activeFeedId } = appState.feeds;
    const currentId = currentTarget.id;
    appState.feeds.prevActiveFeedId = activeFeedId;
    appState.feeds.activeFeedId = activeFeedId !== currentId ? currentId : `${currentId} sameFeed`;
  };

  watch(appState.links, 'typedLink', () => {
    inputField.classList.toggle('is-invalid');
    addLinkBtn.disabled = !appState.links.typedLink.isValid;
  });

  watch(appState.links.typedLink, 'isValid', () => {
    inputField.classList.toggle('is-valid');
  });

  watch(appState.warning, 'isExist', () => {
    warningNode.innerText = appState.warning.warningMessage;
    warningNode.style.display = 'block';
  });

  watch(appState.warning, 'warningMessage', () => {
    warningNode.style.display = 'none';
  });

  watch(appState.links, 'lastAddedUrl', () => {
    inputField.value = '';
  });

  watch(appState.rssFormState, 'atTheBottom', () => {
    moveRssForm(formContainer);
  });

  watch(appState.feeds, 'rssInfo', () => {
    makeRssFeedElem(appState, feedsTag, rssExample, markActive);
  });

  watch(appState.feeds.items, 'freshNews', () => {
    makeNewsList(appState, newsTag, storyExample);
  });

  watch(appState.feeds, 'activeFeedId', () => {
    displayNews(appState, newsTag);
  });

  inputField.addEventListener('input', ({ target }) => {
    const { warningMessage } = appState.warning;
    if (warningMessage) {
      appState.warning.warningMessage = '';
    }
    const { value } = target;
    appState.links.typedLink.isEmpty = value.length === 0;
    const { allAddedUrls } = appState.links;
    const isLinkInList = allAddedUrls.has(value);
    const isLinkValid = validator.isURL(value) && !isLinkInList;
    appState.links.typedLink.isValid = isLinkValid;
    if (isLinkValid) {
      appState.links.lastValidUrl = value;
    }
  });

  const getFreshNews = () => {
    const { rssInfo } = appState.feeds;
    Object.keys(rssInfo).forEach((feedId) => {
      console.log(`refreshing: ${new Date()} -- ${feedId}`);
      const { link } = rssInfo[feedId];
      axios.get(`https://cors-anywhere.herokuapp.com/${link}`)
        .then(parseResponse)
        .then(processData)
        .then(processedData => processNews(processedData.newsList, feedId, appState))
        .catch((err) => {
          alert(`Refreshing failed:\n ${err}`); // eslint-disable-line
          throw new Error(err);
        });
    });
    setTimeout(getFreshNews, 30000);
  };
  let refreshingIsNotStarted = true;

  addRssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const { lastValidUrl, allAddedUrls } = appState.links;

    if (!allAddedUrls.has(lastValidUrl)) {
      allAddedUrls.add(lastValidUrl);
      axios.get(`https://cors-anywhere.herokuapp.com/${lastValidUrl}`)
        .then(parseResponse)
        .then((data) => {
          appState.links.lastAddedUrl = lastValidUrl;
          appState.links.typedLink.isEmpty = true;
          appState.links.typedLink.isValid = false;
          return processData(data);
        })
        .then((processedData) => {
          if (!appState.rssFormState.atTheBottom) {
            appState.rssFormState.atTheBottom = true;
          }
          return updateFeedsState(processedData, appState, lastValidUrl);
        })
        .then((result) => {
          processNews(...result);
          if (refreshingIsNotStarted) {
            refreshingIsNotStarted = false;
            setTimeout(getFreshNews, 30000);
          }
        })
        .catch((err) => {
          const { isExist } = appState.warning;
          appState.warning.warningMessage = 'No rss found at this URL';
          appState.links.typedLink.isValid = false;
          appState.warning.isExist = !isExist;
          throw new Error(err);
        });
    }
  });
};
