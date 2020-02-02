const puppeteer = require('puppeteer');
const {Client} = require('pg');

function dbInitCheck(id, pw, db, client) {
      console.log(`db init start`);

      var table = '';
      switch (db) {
            case `sj`:
                  table = `sj_insta`;
                  break;
            case `catsns`:
                  table = `insta_fans`;
                  break;
            default:
                  break;
      }

      client.connect()
            .then(() => console.log(`postgres db connected successfully`))
            .then(() => client.query(`SELECT * FROM ${table}`))
            .then(results => console.table(`found a table`))
            .catch(e => console.log(e));
      return table;
}

async function getFollowingUsersFromDB(table, client) {
      const selectProc = await client.query(
            `SELECT user_insta_id FROM ${table} ORDER BY id
`,
      );
      const followingListResult = await selectProc.rows;

      return followingListResult;
}

async function followMeBackChecker(id, page) {
      var followListButtonSelector = `#react-root > section > main > div > header > section > ul > li:nth-child(3) > a`;

      const usersFollowingCounts = page.evaluate(() =>
            parseInt(
                  document.querySelector(
                        `#react-root > section > main > div > header > section > ul > li:nth-child(3) > a > span`,
                  ).innerText,
            ),
      );

      //click the follower list button in profile
      await page.waitForSelector(followListButtonSelector);
      await page.evaluate(followListButtonSelector => {
            var followListButton = document.querySelector(
                  followListButtonSelector,
            );
            followListButton.click();
      }, followListButtonSelector);

      await page.on('dialog', async dialog => {
            console.log(dialog, dialog.message());
      });

      await page.waitForXPath('/html/body/div[4]/div/div[2]');
      const result = await page.evaluate(
            (id, usersFollowingCounts) => {
                  // scroll should be top down...
                  // it could take some time
                  var followListDiv = document.evaluate(
                        '/html/body/div[4]/div/div[2]',
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null,
                  ).singleNodeValue;
                  console.log(`followListDiv`, followListDiv);
                  while (
                        followListDiv.scrollHeight <=
                        usersFollowingCounts * 53.97
                  ) {
                        console.log(followListdiv.scrollHeight);
                        followListDiv.scrollBy(0, followListDiv.scrollHeight);
                  }
                  console.table([followListDiv.innerText]);
                  console.log(`comparing with my 'id'`, id);
                  var isHeFollowMe = followListDiv.innerText.includes(`${id}`);
                  return isHeFollowMe;
            },
            id,
            usersFollowingCounts,
      );

      return result;
}

async function closeFollowingWindow(page) {
      await page.evaluate(() => {
            var closingFollowerWindowButton = document.querySelector(
                  `body > div> div > div:nth-child(1) > div > div:nth-child(3) > button`,
            );

            closingFollowerWindowButton.click();
      });
}

async function unfollowProc(page) {
      await page.evaluate(() => {
            var unfollowButton = document.querySelector(
                  `#react-root > section > main > div > header > section > div> div> span > span> button`,
            );

            if (unfollowButton.innerText == `Follow`) {
                  console.log(`already we don't follow this account `);
            } else {
                  unfollowButton.click();
                  var unfollowConfirmButton = document.querySelector(
                        `body > div > div > div > div > button`,
                  );
                  unfollowConfirmButton.click();
            }
      });
}

async function unfollowWhoNotFollowBack(page, id, pw, db, client) {
      console.table([id, pw, db]);

      const table = dbInitCheck(id, pw, db, client);
      const followingUsers = await getFollowingUsersFromDB(table, client);
      console.log(followingUsers);

      for (var rawFollowingUser of followingUsers) {
            var followingUser = rawFollowingUser.user_insta_id;
            console.log(`will check ${followingUser} follow me or not`);
            await page.goto(`https://instagram.com/${followingUser}`, {
                  waituntil: 'networkidle2',
            });

            console.log(page.url());

            const isHeFollowMeBack = await followMeBackChecker(id, page);
            console.log(`Is he follow me back?`, isHeFollowMeBack);

            //    const isTheButtonFollow = await getFollowStatusButtonText(page);
            if (isHeFollowMeBack) {
                  closeFollowingWindow(page);
                  console.log(`will keep follow ${followingUser}`);
            } else {
                  closeFollowingWindow(page);
                  unfollowProc(page);
            }
      }
}

module.exports = {
      unfollowWhoNotFollowBack,
};