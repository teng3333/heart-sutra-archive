/**
 * Today's Nine — 今日の九曲(種火版)
 * 高尾の般若心経プレイリスト(SUNO・84曲)から、UTC日付をシードに毎日9曲を選ぶ。
 * 同じ日は世界中どこで見ても同じ9曲。バックエンド接続(submissions テーブル)までの暫定実装。
 * データ出典: https://suno.com/playlist/5ae1adc6-893c-4fce-bfec-a0114e0bd925 (2026-07-18取得)
 */
(function () {
  'use strict';

  var ARTIST_NAME = 'TENG3';
  var ARTIST_URL = 'https://suno.com/@rockingtreble058';
  var IMG_BASE = 'https://cdn2.suno.ai/'; // カバーはSUNOのサムネイル流用(構想書v0.1 第4章 Phase 1方針)

  // [SUNO曲ID, タイトル, 秒数, カバー画像ファイル名]
  var TRACKS = [
    ['63c74f90-95f1-4d32-a6f5-bc77709da616', '般若心経IDM', 195, 'video_upload_c57d9734-d357-468d-8a68-594080d7ef17_video_upload_c57d9734-d357-468d-8a68-594080d7ef17_cover_snapshot_0s_1773667912_image.jpeg'],
    ['c6c774a9-ccbd-4962-94ce-c39d4a79a5f5', '般若心経acoustic', 115, 'c6c774a9-ccbd-4962-94ce-c39d4a79a5f5_e89b9fd8.jpeg'],
    ['a9ccf105-926a-446a-b7ca-af8615bfa0fb', '般若心経演歌', 173, 'video_upload_76183ca0-e694-445a-8d77-1a8e27e6f04a_video_upload_76183ca0-e694-445a-8d77-1a8e27e6f04a_cover_snapshot_0s_1774870393_image.jpeg'],
    ['181a4bf1-6b8d-4674-bba8-b8bc1f0db6f7', '般若心経Halloween', 117, 'video_upload_7c0bd0cd-577c-46f5-95b1-ac4912cefdc7_video_upload_7c0bd0cd-577c-46f5-95b1-ac4912cefdc7_cover_snapshot_0s_1775351834_image.jpeg'],
    ['5a4cca58-4334-4d1a-bdb1-ee9cb2919b2b', '般若心経Blues', 232, 'video_upload_60ad3bae-926d-4fcb-bef3-0c3c5cbde68c_video_upload_60ad3bae-926d-4fcb-bef3-0c3c5cbde68c_cover_snapshot_0s_1774094943_image.jpeg'],
    ['b2c398b6-227b-4c28-9e14-415816f61e08', '般若心経indie', 165, 'video_upload_cd74a396-807a-409e-b74f-d3bd8f57484b_video_upload_cd74a396-807a-409e-b74f-d3bd8f57484b_cover_snapshot_0s_1773840864_image.jpeg'],
    ['d66a0950-6ca8-4b76-b8d9-01e6078d5079', '般若心経tango', 159, 'video_upload_2097e3ef-3c10-4278-9879-4f23be9c6cb5_video_upload_2097e3ef-3c10-4278-9879-4f23be9c6cb5_cover_snapshot_0s_1773666361_image.jpeg'],
    ['cc6b2656-2c5e-4d84-b7ca-0edde4cfa779', '般若心経Bollywood', 175, 'video_upload_6a6e6388-13c0-4261-bc5a-9be6fa52523d_video_upload_6a6e6388-13c0-4261-bc5a-9be6fa52523d_cover_snapshot_0s_1773732347_image.jpeg'],
    ['ce43862f-35c6-4b5e-a307-94eb6c64008d', '般若心経呟', 192, 'video_upload_5d839f0d-1ab2-4b1e-89a0-8ed981b37afa_video_upload_5d839f0d-1ab2-4b1e-89a0-8ed981b37afa_cover_snapshot_0s_1773661883_image.jpeg'],
    ['4ddc0809-4891-4db7-aa40-49117fce3e8c', '般若心経ARTPOP', 150, 'video_upload_fbfdc92e-2587-485b-a9d3-7a2852ddbcb4_video_upload_fbfdc92e-2587-485b-a9d3-7a2852ddbcb4_cover_snapshot_0s_1773460379_image.jpeg'],
    ['c75799dc-bf77-4398-b920-9effd0b86181', '般若心経IDM', 153, 'video_upload_0b782ae4-9600-4a16-bcba-303d2d28654c_video_upload_0b782ae4-9600-4a16-bcba-303d2d28654c_cover_snapshot_0s_1773326010_image.jpeg'],
    ['f0492cef-86b9-47a0-9cd2-59f5a853958d', '般若心経和楽器RAP', 135, 'video_upload_92d4d83b-3077-4f1c-a601-555b102156f1_video_upload_92d4d83b-3077-4f1c-a601-555b102156f1_cover_snapshot_0s_1768221005_image.jpeg'],
    ['6168bf30-98ce-421f-8a87-5df541b921db', 'ただ空があるだけ', 110, 'video_upload_09945a9a-33c0-4513-b5b4-26b563e3eeb3_video_upload_09945a9a-33c0-4513-b5b4-26b563e3eeb3_cover_snapshot_0s_1767878182_image.jpeg'],
    ['16c5e53e-191f-4815-8c6d-1acc0f85f357', '般若心経jazz-HIPHOP', 134, 'video_upload_b84ab71f-c6bb-4494-91f2-55427113a7ac_video_upload_b84ab71f-c6bb-4494-91f2-55427113a7ac_cover_snapshot_0s_1767616583_image.jpeg'],
    ['2d7d692a-c54f-476c-8a07-0e3842c07ad3', '般若心経metal', 116, 'video_upload_e2a0d528-90a7-48ac-b13c-619deb0d2167_video_upload_e2a0d528-90a7-48ac-b13c-619deb0d2167_cover_snapshot_0s_1767523863_image.jpeg'],
    ['e4ed0524-2273-4727-b093-73d32d63d445', '般若心経アイドル', 115, 'video_upload_7c44edc6-8be6-422d-8705-a76e9780f704_video_upload_7c44edc6-8be6-422d-8705-a76e9780f704_cover_snapshot_0s_1773235180_image.jpeg'],
    ['217948ac-2c80-4f14-a186-74af99066c7b', '般若心経JAZZ', 175, 'video_upload_5a6956aa-b00e-4f4c-9afc-d8102c93357d_video_upload_5a6956aa-b00e-4f4c-9afc-d8102c93357d_cover_snapshot_0s_1773746084_image.jpeg'],
    ['0400c852-651a-407e-ae8a-b01705ecc12d', '般若心経エレクトロハウス', 124, 'video_upload_8c3399d7-db83-41fd-86f1-dfd14e3be59f_video_upload_8c3399d7-db83-41fd-86f1-dfd14e3be59f_cover_snapshot_0s_1767191833_image.jpeg'],
    ['103b2fd6-7746-428c-89b5-9c6416cdc4fc', '般若心経TECHNO', 134, 'video_upload_613aaee6-174e-4bea-9495-41e9f8b3d6df_video_upload_613aaee6-174e-4bea-9495-41e9f8b3d6df_cover_snapshot_0s_1774101508_image.jpeg'],
    ['8dc7f16b-95e5-473a-9c1b-94d290568a0a', '般若心経PUNK', 145, '8dc7f16b-95e5-473a-9c1b-94d290568a0a_4d1f871c.jpeg'],
    ['aa7ca553-f716-413f-9db7-7e6da3cdb857', '般若心経ROCK', 125, 'video_upload_60197139-a962-41cf-8b21-053270067c78_video_upload_60197139-a962-41cf-8b21-053270067c78_cover_snapshot_0s_1774096554_image.jpeg'],
    ['b2cad46f-746e-4d77-abee-6983150dd1db', '般若心経ROCK', 135, 'video_upload_3daf1961-6212-477a-8308-e8b114f4661e_video_upload_3daf1961-6212-477a-8308-e8b114f4661e_cover_snapshot_0s_1773746413_image.jpeg'],
    ['3c0565e3-a922-42a9-9cad-2dfe16f2879f', '般若心経funk', 118, 'video_upload_6ffcd9f9-c038-459d-ba48-fad029538cbe_video_upload_6ffcd9f9-c038-459d-ba48-fad029538cbe_cover_snapshot_0s_1774877208_image.jpeg'],
    ['4e1e90d4-6c25-4523-b452-a0eef6fd1d55', '般若心経', 135, '4e1e90d4-6c25-4523-b452-a0eef6fd1d55_8af51d86.jpeg'],
    ['05708a07-14fa-4c4e-a7ad-3ed1cedb4e41', '般若心経CyberPunk', 203, '05708a07-14fa-4c4e-a7ad-3ed1cedb4e41_ead9a14d.jpeg'],
    ['183b4c6f-54a4-4807-a722-fb11fe703211', '般若心経Lo-fi', 121, '183b4c6f-54a4-4807-a722-fb11fe703211_4118625c.jpeg'],
    ['abdfa05f-79b1-49b8-a63a-f3285f0972ad', '般若心経cyberpunk', 170, 'video_upload_e8ee4e72-4445-4b80-b04a-9df3c7caf899_video_upload_e8ee4e72-4445-4b80-b04a-9df3c7caf899_cover_snapshot_0s_1767526957_image.jpeg'],
    ['04d72c5e-675c-468f-bf2c-eaf1fb37d2a9', '般若心経cyber punk', 148, 'video_upload_ce6d3708-cd64-47bd-a869-13b3e44f2498_video_upload_ce6d3708-cd64-47bd-a869-13b3e44f2498_cover_snapshot_0s_1767527211_image.jpeg'],
    ['acf9eab3-8e05-440a-bdc0-dc926be9eb23', '般若心経cyberpunk', 173, 'acf9eab3-8e05-440a-bdc0-dc926be9eb23_faff8e9f.jpeg'],
    ['4c5dab56-a168-4093-9fe7-c15cd39dfbbf', '般若心経アニソン', 123, '4c5dab56-a168-4093-9fe7-c15cd39dfbbf_ef214520.jpeg'],
    ['aefa5a37-5108-4530-bd91-ad46030d3789', '般若心経cyberpunk', 197, 'video_upload_f9c7316e-5ee8-4849-a3ea-9d583ae7774e_video_upload_f9c7316e-5ee8-4849-a3ea-9d583ae7774e_cover_snapshot_0s_1767526693_image.jpeg'],
    ['d0e39bb7-08fa-4c2f-8ba2-6d71d27348da', '般若心経cyberpunk', 160, 'd0e39bb7-08fa-4c2f-8ba2-6d71d27348da_b66d4dae.jpeg'],
    ['bc754292-74b1-474c-94aa-67631d5a9eb7', '般若心経アニソン', 143, 'video_upload_b66bc771-1c02-46b0-9a67-a554e36638e2_video_upload_b66bc771-1c02-46b0-9a67-a554e36638e2_cover_snapshot_0s_1767524187_image.jpeg'],
    ['fc643b27-7208-490b-a512-498353d4749e', '般若心経HIPHOP', 107, 'fc643b27-7208-490b-a512-498353d4749e_69c99e5d.jpeg'],
    ['b7c50f09-0c74-45c4-964f-7b97b0ecdf44', '般若心経bossa nova', 162, 'video_upload_b5b5a087-beb2-4da1-b17c-90f12a5071dc_video_upload_b5b5a087-beb2-4da1-b17c-90f12a5071dc_cover_snapshot_0s_1775744153_image.jpeg'],
    ['ad948f36-ddd6-4f4a-aa42-343be69a6857', '般若心経Flamenco', 103, 'video_upload_5fa21028-76fc-48a2-912d-c9030aab1ef3_video_upload_5fa21028-76fc-48a2-912d-c9030aab1ef3_cover_snapshot_0s_1775768987_image.jpeg'],
    ['b6adbb7a-fd59-47f8-9594-5b97a581185c', '般若心経Arabian', 183, 'video_upload_fe61fcba-391e-45b2-a025-7fe66fa26e96_video_upload_fe61fcba-391e-45b2-a025-7fe66fa26e96_cover_snapshot_0s_1775830593_image.jpeg'],
    ['c2fb24d0-21f3-4043-934b-8dd07b4eec64', '般若心経K-POP', 80, 'video_upload_40554a53-5294-4b15-8c22-b8dad7885ef6_video_upload_40554a53-5294-4b15-8c22-b8dad7885ef6_cover_snapshot_0s_1775907960_image.jpeg'],
    ['b1ce3e08-7152-4455-a8ee-e5fff3ea314f', '般若心経reggae', 120, 'video_upload_4400fa48-185b-4c5d-a88d-ff0b7a921e71_video_upload_4400fa48-185b-4c5d-a88d-ff0b7a921e71_cover_snapshot_0s_1775963400_image.jpeg'],
    ['e258a114-7ed2-40b0-9c8b-8b3f6ed2fe84', '般若心経R&B', 111, 'video_upload_005bb64b-fe03-44f2-b616-ec1f802107b5_video_upload_005bb64b-fe03-44f2-b616-ec1f802107b5_cover_snapshot_0s_1775978914_image.jpeg'],
    ['7667d0a4-c9a8-47cf-b397-2e761e4472b3', '般若心経ska', 95, 'video_upload_660c83da-7765-4ae4-92b0-5dd0abc5472a_video_upload_660c83da-7765-4ae4-92b0-5dd0abc5472a_cover_snapshot_0s_1775979927_image.jpeg'],
    ['4b28307a-659f-4e19-8be2-56df97f284e7', '般若心経Grunge', 100, 'video_upload_2ed73563-98fb-4b72-a2af-f016f07d2805_video_upload_2ed73563-98fb-4b72-a2af-f016f07d2805_cover_snapshot_0s_1775984988_image.jpeg'],
    ['2b6e2fdf-6ec1-472f-bcf6-55d3942d3d42', '般若心経samba', 102, 'video_upload_8395679d-1ff6-4b26-bc4d-aa21ea7bb3f8_video_upload_8395679d-1ff6-4b26-bc4d-aa21ea7bb3f8_cover_snapshot_0s_1775992782_image.jpeg'],
    ['89554a3d-a1cd-4cd3-afb8-2975a5d72fc7', '般若心経讃美歌', 208, 'video_upload_c3ffc03b-0df3-43a7-bce7-afe764d0e6d3_video_upload_c3ffc03b-0df3-43a7-bce7-afe764d0e6d3_cover_snapshot_0s_1775127399_image.jpeg'],
    ['e3cfe17d-47d6-4630-836c-5e9f326440a4', '般若心経Ambient', 145, 'video_upload_a1d3916a-9a04-48bc-ac24-dc55224b0221_video_upload_a1d3916a-9a04-48bc-ac24-dc55224b0221_cover_snapshot_0s_1776083964_image.jpeg'],
    ['67489dfc-71e0-450c-bac1-1acc30fee9b3', '般若心経Belly Dance', 101, 'video_upload_eacb6db3-1ac3-4d16-9a88-b38a1dea9a1a_video_upload_eacb6db3-1ac3-4d16-9a88-b38a1dea9a1a_cover_snapshot_0s_1776168293_image.jpeg'],
    ['1c4dea16-3d44-49e4-913a-60d31ac1b349', '般若心経Cloud Rap', 107, 'video_upload_f6f44617-0bc3-46a6-b678-3b6e10c08f22_video_upload_f6f44617-0bc3-46a6-b678-3b6e10c08f22_cover_snapshot_0s_1776170205_image.jpeg'],
    ['1ccd02ec-5454-4cde-909f-92906ea976ff', '般若心経Cloud Rap', 112, 'video_upload_204cf266-4b2f-459a-b7de-8af5f8ba7875_video_upload_204cf266-4b2f-459a-b7de-8af5f8ba7875_cover_snapshot_0s_1776172233_image.jpeg'],
    ['560f8229-d942-4497-8d5e-426022fd7d51', '般若心経Cloud Rap', 122, 'video_upload_673154ff-94d6-4e8a-af9f-ee2f901d1eab_video_upload_673154ff-94d6-4e8a-af9f-ee2f901d1eab_cover_snapshot_0s_1776174188_image.jpeg'],
    ['5715e04a-500d-46f5-abe4-9f0329431ba9', '般若心経 rockabilly grunge', 105, 'video_upload_32a227aa-5a89-485b-a4cb-9e8f19e8d75f_video_upload_32a227aa-5a89-485b-a4cb-9e8f19e8d75f_cover_snapshot_0s_1776467494_image.jpeg'],
    ['f914e4a0-7741-4a91-b8a6-adf9ab2fad7a', '般若心経techno-pop', 114, 'video_upload_74c6fd69-57c6-43e9-8530-b693884b136d_video_upload_74c6fd69-57c6-43e9-8530-b693884b136d_cover_snapshot_0s_1776636103_image.jpeg'],
    ['b99abcd6-e9d4-4f4b-8205-7bd3f2f24f37', '般若心経Dream Pop', 162, 'video_upload_a60d9b3f-ab4a-4a42-8120-2092bcf66ed0_video_upload_a60d9b3f-ab4a-4a42-8120-2092bcf66ed0_cover_snapshot_0s_1776686853_image.jpeg'],
    ['15fa1fc5-5d5d-42f2-a04f-afd10a1be135', '般若心経 韓流ドラマ', 158, 'video_upload_cdb557c5-6927-4ac2-aea7-390b75ef4bfa_video_upload_cdb557c5-6927-4ac2-aea7-390b75ef4bfa_cover_snapshot_0s_1776684635_image.jpeg'],
    ['c258365e-7867-4ec9-b0ce-d19e382d5595', '般若心経Psychedelic ROCK', 121, 'video_upload_e5383e6b-5a10-4b92-9491-bc5f4ce23740_video_upload_e5383e6b-5a10-4b92-9491-bc5f4ce23740_cover_snapshot_0s_1777378894_image.jpeg'],
    ['4439bfe0-fff3-43b3-863a-350b0dbfaed8', '般若心経EDMⅡ', 251, 'video_upload_5dd6f68f-77bb-4881-adc6-e595a29bdc44_video_upload_5dd6f68f-77bb-4881-adc6-e595a29bdc44_cover_snapshot_0s_1777457249_image.jpeg'],
    ['602db34b-eab1-4419-9858-4482a27521cc', '般若心経 urban r&b', 116, 'video_upload_2204a2d8-dc6a-4c92-bf9e-96f82b2f1809_video_upload_2204a2d8-dc6a-4c92-bf9e-96f82b2f1809_cover_snapshot_0s_1777731381_image.jpeg'],
    ['0c2abbfd-b342-41fd-a4ff-ef77dfb441db', '般若心経 70’s', 176, 'video_upload_a27a2422-b34c-4e79-a254-9b4ae57ac35e_video_upload_a27a2422-b34c-4e79-a254-9b4ae57ac35e_cover_snapshot_0s_1779882653_image.jpeg'],
    ['010f671b-ef63-447b-9084-511666fd1353', '般若心経 Ambient', 159, 'video_upload_9d3ab2ba-dad6-47eb-9cd2-8f4a9a62424f_video_upload_9d3ab2ba-dad6-47eb-9cd2-8f4a9a62424f_cover_snapshot_0s_1782827640_image.jpeg'],
    ['1d14518e-3c55-4a2c-99fa-48c133e4334d', '般若心経 Ambient EDM', 88, 'video_upload_48f86da4-b11f-4468-8bc2-29bc45c73454_video_upload_48f86da4-b11f-4468-8bc2-29bc45c73454_cover_snapshot_0s_1783212091_image.jpeg'],
    ['0563a0ba-3419-4c21-93ac-ce4b6e678ed0', '般若心経 AmbientⅡ', 205, 'video_upload_491d7d22-22f4-4fda-94d1-6310d8f8deb4_video_upload_491d7d22-22f4-4fda-94d1-6310d8f8deb4_cover_snapshot_0s_1783216907_image.jpeg'],
    ['95431bf3-49cf-4cf1-86cc-8ab1c4d3c90d', '般若心経', 114, 'image_95431bf3-49cf-4cf1-86cc-8ab1c4d3c90d.jpeg'],
    ['5921f891-1ceb-473c-9d00-0a63f79b88f7', '般若心経 EDM JAZZ', 123, 'video_upload_ea9a8c4e-44ed-4a9f-aaac-29484829a89d_video_upload_ea9a8c4e-44ed-4a9f-aaac-29484829a89d_cover_snapshot_0s_1783225242_image.jpeg'],
    ['82fa5828-609b-464b-a534-40eda52dbc4e', '般若心経', 97, 'image_82fa5828-609b-464b-a534-40eda52dbc4e.jpeg'],
    ['44ea685c-c092-4277-b566-6fe661ecb2ab', '般若心経 Free-Garage JAZZ', 103, 'video_upload_d5d299c1-8ffd-42ab-b08d-70fcc919fdf5_video_upload_d5d299c1-8ffd-42ab-b08d-70fcc919fdf5_cover_snapshot_0s_1783947974_image.jpeg'],
    ['fa18fd43-73cb-4191-a328-6e7fbd011a86', '般若心経 Ambient jazz', 138, 'video_upload_2ac93627-4ed5-448f-ad48-3a020adfa0da_video_upload_2ac93627-4ed5-448f-ad48-3a020adfa0da_cover_snapshot_0s_1783172435_image.jpeg'],
    ['138bf393-7bae-49ba-882f-ed8f1e4768ef', '般若心経', 126, 'image_138bf393-7bae-49ba-882f-ed8f1e4768ef.jpeg'],
    ['4b944478-860c-40d0-861b-cd9151af09a6', '般若心経', 81, 'image_4b944478-860c-40d0-861b-cd9151af09a6.jpeg'],
    ['cef5ea94-d510-4f34-b8be-09d43b6687fa', '般若心経', 135, 'image_cef5ea94-d510-4f34-b8be-09d43b6687fa.jpeg'],
    ['f70970f6-13c6-4267-b800-f4a2834b1ecd', '般若心経 Ambient Jazz Mix', 152, 'video_upload_c34f2ef4-41b5-40fa-ba08-76329b0f76cc_video_upload_c34f2ef4-41b5-40fa-ba08-76329b0f76cc_cover_snapshot_0s_1783256993_image.jpeg'],
    ['301f382b-8b77-4918-9784-a8d0ab1cee8d', '般若心経 jazz lo-fi', 158, 'video_upload_7a1f8b19-25dd-4058-95e5-0c21d92ee3c5_video_upload_7a1f8b19-25dd-4058-95e5-0c21d92ee3c5_cover_snapshot_0s_1783347778_image.jpeg'],
    ['9bfca4db-7720-4506-8745-b6dc154bb364', '般若心経', 133, 'image_9bfca4db-7720-4506-8745-b6dc154bb364.jpeg'],
    ['7720d74d-fc62-4759-b1b2-d4452ac6eada', '般若心経', 101, 'image_7720d74d-fc62-4759-b1b2-d4452ac6eada.jpeg'],
    ['6c564f6a-5d69-490e-bc37-3cfe4a3d3672', '般若心経', 141, 'image_6c564f6a-5d69-490e-bc37-3cfe4a3d3672.jpeg'],
    ['82d242ac-aa69-48ab-a8e8-84653576aea4', '般若心経', 113, 'image_82d242ac-aa69-48ab-a8e8-84653576aea4.jpeg'],
    ['ba93f517-3d51-4706-9fbd-50b01aecbc5d', '般若心経', 148, 'image_ba93f517-3d51-4706-9fbd-50b01aecbc5d.jpeg'],
    ['14a49cbe-23c1-4c71-bcdd-300e6a859fc2', '般若心経', 108, 'image_14a49cbe-23c1-4c71-bcdd-300e6a859fc2.jpeg'],
    ['f27ffefd-3056-4c51-871f-0bd28a6aa035', '般若心経 odd time signature', 156, 'video_upload_7f258ca4-fe1b-43d9-8bfc-f04f585c1917_video_upload_7f258ca4-fe1b-43d9-8bfc-f04f585c1917_cover_snapshot_0s_1783434333_image.jpeg'],
    ['a3822fec-2241-467b-879d-4e89b71e38ad', '般若心経 POP JAZZ', 127, 'video_upload_31263a6f-3642-41f3-acb6-26a28755c449_video_upload_31263a6f-3642-41f3-acb6-26a28755c449_cover_snapshot_0s_1783596746_image.jpeg'],
    ['b6043089-ef1a-4f86-ad90-cc449469e13b', '般若心経', 117, 'image_b6043089-ef1a-4f86-ad90-cc449469e13b.jpeg'],
    ['add699f7-9d2a-4223-876f-dac14f7c6e1c', '般若心経 acid jazz', 97, 'video_upload_9d112482-ed6b-4893-9dab-84d3a330bbb3_video_upload_9d112482-ed6b-4893-9dab-84d3a330bbb3_cover_snapshot_0s_1784333482_image.jpeg'],
    ['7349d0a1-be1f-4e5e-9d32-cc96e1507e4b', '般若心経 JAZZ EDM', 100, 'video_upload_f2bf4e1c-ab1b-48ef-ad4a-0e27af55c2bf_video_upload_f2bf4e1c-ab1b-48ef-ad4a-0e27af55c2bf_cover_snapshot_0s_1784347388_image.jpeg'],
    ['e0ece316-d1af-4e39-ac75-dc1ae41eafee', '般若心経', 100, 'image_e0ece316-d1af-4e39-ac75-dc1ae41eafee.jpeg'],
    ['d09dfc8f-6dbc-45cd-93e8-07aea166ebcd', '般若心経', 111, 'image_d09dfc8f-6dbc-45cd-93e8-07aea166ebcd.jpeg'],
    ['19bf3a11-3120-4d57-bd38-12e936245019', '般若心経', 107, 'image_19bf3a11-3120-4d57-bd38-12e936245019.jpeg']
  ];

  // 日付シード付き乱数(mulberry32)。同じ日 = 同じ列
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function todaysNine() {
    var now = new Date();
    var seed = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
    var rand = mulberry32(seed);
    var idx = TRACKS.map(function (_, i) { return i; });
    for (var i = idx.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
    }
    return idx.slice(0, 9).map(function (i) { return TRACKS[i]; });
  }

  function fmt(sec) {
    return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function render() {
    var grid = document.getElementById('nine-grid');
    if (!grid) return;
    todaysNine().forEach(function (t) {
      var card = el('div', 'work');

      var cover = el('span', 'cover');
      var img = document.createElement('img');
      img.src = IMG_BASE + t[3];
      img.alt = '';
      img.loading = 'lazy';
      cover.appendChild(img);
      card.appendChild(cover);

      var body = el('div', 'body');
      card.appendChild(body);

      body.appendChild(el('span', 'win', 'First Archive 原初'));

      var main = el('a', 'work-main');
      main.href = 'https://suno.com/song/' + t[0];
      main.target = '_blank';
      main.rel = 'noopener';
      var title = el('span', 'title');
      title.appendChild(el('span', 'play', '▶'));
      title.appendChild(document.createTextNode(t[1]));
      main.appendChild(title);
      body.appendChild(main);

      var artist = el('span', 'artist');
      artist.appendChild(document.createTextNode('by '));
      var alink = el('a', null, ARTIST_NAME);
      alink.href = ARTIST_URL;
      alink.target = '_blank';
      alink.rel = 'noopener';
      artist.appendChild(alink);
      artist.appendChild(document.createTextNode(' '));
      artist.appendChild(el('span', 'flag', '🇯🇵'));
      body.appendChild(artist);

      var meta = el('span', 'meta');
      meta.appendChild(el('span', null, fmt(t[2])));
      meta.appendChild(el('span', null, 'SUNO'));
      body.appendChild(meta);

      grid.appendChild(card);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
