zipLib() {
	mkdir bootLib/$1
	cd $1
	if [ -d htdocs ]
	then
		cp -pfRL htdocs ../bootLib/$1/
	fi
	cd helma
	zip -9 -r ../../bootLib/$1/$1.zip * -x "*/.DS_Store" "*/.svn/*"
	cd ../..
}

mkdir bootLib

zipLib "baseLib"
zipLib "editLib"
zipLib "typeLib"
zipLib "postLib"
zipLib "wikiLib"
zipLib "feedLib"

zip -9 -r bootLib.zip bootLib/* -x "*/.DS_Store" "*/.svn/*"

rm -fr bootLib